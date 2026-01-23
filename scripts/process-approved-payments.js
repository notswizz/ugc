/**
 * Process payments for all approved submissions that don't have payments yet.
 * This will transfer balance from brand to creator for all approved submissions.
 *
 * Run with: node scripts/process-approved-payments.js
 */

const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
} catch (e) {
  console.warn('Could not load .env.local, using existing env');
}

const admin = require('firebase-admin');

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const db = admin.firestore();

async function processApprovedPayments() {
  console.log('Processing payments for approved submissions...\n');

  try {
    // Get all approved submissions
    const approvedSubmissionsQuery = db.collection('submissions').where('status', '==', 'approved');
    const approvedSubmissionsSnapshot = await approvedSubmissionsQuery.get();

    if (approvedSubmissionsSnapshot.empty) {
      console.log('No approved submissions found.');
      return;
    }

    console.log(`Found ${approvedSubmissionsSnapshot.size} approved submission(s).\n`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const submissionDoc of approvedSubmissionsSnapshot.docs) {
      const submission = { id: submissionDoc.id, ...submissionDoc.data() };
      const submissionId = submission.id;
      const gigId = submission.gigId;
      const creatorId = submission.creatorId;

      try {
        // Check if payment already exists
        const existingPaymentsQuery = db
          .collection('payments')
          .where('submissionId', '==', submissionId)
          .where('creatorId', '==', creatorId);
        const existingPayments = await existingPaymentsQuery.get();

        if (!existingPayments.empty) {
          console.log(`  ⏭️  Skipping submission ${submissionId} - payment already exists`);
          skipped++;
          continue;
        }

        // Get gig data
        const gigDoc = await db.collection('gigs').doc(gigId).get();
        if (!gigDoc.exists) {
          console.log(`  ❌ Skipping submission ${submissionId} - gig ${gigId} not found`);
          errors++;
          continue;
        }
        const gig = { id: gigDoc.id, ...gigDoc.data() };

        // Calculate base payout
        let basePayout = parseFloat(gig.basePayout) || 0;

        if (gig.payoutType === 'dynamic' && gig.followerRanges && gig.followerRanges.length > 0) {
          // Get creator data to calculate payout based on follower count
          const creatorDoc = await db.collection('creators').doc(creatorId).get();
          if (creatorDoc.exists) {
            const creator = creatorDoc.data();
            const followingCount = (creator?.followingCount?.tiktok || 0) +
                                  (creator?.followingCount?.instagram || 0) +
                                  (creator?.followingCount?.youtube || 0) +
                                  (creator?.followingCount?.linkedin || 0);

            // Find matching range
            const sortedRanges = [...gig.followerRanges].sort((a, b) => (a.min || 0) - (b.min || 0));
            for (const range of sortedRanges) {
              const min = range.min || 0;
              const max = range.max;

              if (followingCount >= min) {
                if (max === null || max === undefined || followingCount <= max) {
                  basePayout = range.payout || 0;
                  break;
                }
              }
            }
          }
        }

        // Calculate platform fee (15% default)
        const platformFeePercentage = parseFloat(
          process.env.PLATFORM_FEE_PERCENTAGE ||
          process.env.platform_fee_percentage ||
          '15'
        );
        const platformFeeRate = platformFeePercentage / 100;
        const platformFee = basePayout * platformFeeRate;

        // Reimbursement amount
        let reimbursementAmount = 0;
        if (submission.productPurchase) {
          const requestedReimbursement = parseFloat(submission.productPurchase.amount) || 0;
          const reimbursementCap = parseFloat(gig.reimbursementCap) || 0;
          if (requestedReimbursement > 0 && reimbursementCap > 0) {
            reimbursementAmount = Math.min(requestedReimbursement, reimbursementCap);
          }
        }

        const bonusAmount = 0;
        const creatorNet = basePayout - platformFee + reimbursementAmount + bonusAmount;

        if (creatorNet <= 0) {
          console.log(`  ⚠️  Skipping submission ${submissionId} - creator net amount is 0 or negative`);
          skipped++;
          continue;
        }

        // Check brand balance
        const brandDoc = await db.collection('brands').doc(gig.brandId).get();
        if (!brandDoc.exists) {
          console.log(`  ❌ Skipping submission ${submissionId} - brand ${gig.brandId} not found`);
          errors++;
          continue;
        }
        const brandBalance = brandDoc.data()?.balance || 0;
        const totalRequired = creatorNet + platformFee;

        if (brandBalance < totalRequired) {
          console.log(`  ⚠️  Skipping submission ${submissionId} - insufficient brand balance. Required: $${totalRequired.toFixed(2)}, Available: $${brandBalance.toFixed(2)}`);
          skipped++;
          continue;
        }

        // Process payment using balance system
        // Transfer balance from brand to creator
        await db.runTransaction(async (transaction) => {
          const brandRef = db.collection('brands').doc(gig.brandId);
          const creatorRef = db.collection('creators').doc(creatorId);

          const [brandDoc, creatorDoc] = await Promise.all([
            transaction.get(brandRef),
            transaction.get(creatorRef),
          ]);

          if (!brandDoc.exists || !creatorDoc.exists) {
            throw new Error('Brand or creator not found');
          }

          const brandBalance = brandDoc.data()?.balance || 0;
          const creatorBalance = creatorDoc.data()?.balance || 0;
          const totalRequired = creatorNet + platformFee;

          if (brandBalance < totalRequired) {
            throw new Error(`Insufficient brand balance. Current: $${brandBalance.toFixed(2)}, Required: $${totalRequired.toFixed(2)}`);
          }

          transaction.update(brandRef, {
            balance: brandBalance - totalRequired,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          transaction.update(creatorRef, {
            balance: creatorBalance + creatorNet,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });

        // Get balances after transaction for records
        const brandDocAfter = await db.collection('brands').doc(gig.brandId).get();
        const creatorDocAfter = await db.collection('creators').doc(creatorId).get();
        const brandBalanceAfter = brandDocAfter.data()?.balance || 0;
        const creatorBalanceAfter = creatorDocAfter.data()?.balance || 0;

        // Create balance transaction records
        await db.collection('balanceTransactions').add({
          brandId: gig.brandId,
          creatorId,
          amount: creatorNet,
          brandBalanceBefore: brandBalanceAfter + totalRequired,
          brandBalanceAfter: brandBalanceAfter,
          creatorBalanceBefore: creatorBalanceAfter - creatorNet,
          creatorBalanceAfter: creatorBalanceAfter,
          reason: `Payment for approved submission ${submissionId}`,
          metadata: {
            submissionId,
            gigId,
            basePayout,
            bonusAmount,
            reimbursementAmount,
            platformFee,
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Transfer platform fee from brand to BANK account
        if (platformFee > 0) {
          const BANK_ID = 'BANK';
          const bankRef = db.collection('brands').doc(BANK_ID);
          const bankDoc = await bankRef.get();

          if (!bankDoc.exists) {
            await bankRef.set({
              uid: BANK_ID,
              companyName: 'Platform Bank',
              balance: 0,
              status: 'active',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }

          await db.runTransaction(async (transaction) => {
            const brandRef = db.collection('brands').doc(gig.brandId);
            const bankRef = db.collection('brands').doc(BANK_ID);

            const [brandDoc, bankDoc] = await Promise.all([
              transaction.get(brandRef),
              transaction.get(bankRef),
            ]);

            const brandBalance = brandDoc.data()?.balance || 0;
            const bankBalance = bankDoc.data()?.balance || 0;

            transaction.update(brandRef, {
              balance: brandBalance - platformFee,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            transaction.update(bankRef, {
              balance: bankBalance + platformFee,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          });

          const brandDocAfterFee = await db.collection('brands').doc(gig.brandId).get();
          const bankDocAfterFee = await db.collection('brands').doc(BANK_ID).get();
          const brandBalanceAfterFee = brandDocAfterFee.data()?.balance || 0;
          const bankBalanceAfterFee = bankDocAfterFee.data()?.balance || 0;

          await db.collection('balanceTransactions').add({
            userId: gig.brandId,
            userType: 'brand',
            amount: -platformFee,
            balanceBefore: brandBalanceAfterFee + platformFee,
            balanceAfter: brandBalanceAfterFee,
            reason: `Platform fee for submission ${submissionId}`,
            metadata: {
              submissionId,
              gigId,
              creatorId,
              platformFee,
              type: 'platform_fee',
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          await db.collection('balanceTransactions').add({
            userId: BANK_ID,
            userType: 'brand',
            amount: platformFee,
            balanceBefore: bankBalanceAfterFee - platformFee,
            balanceAfter: bankBalanceAfterFee,
            reason: `Platform fee for submission ${submissionId}`,
            metadata: {
              submissionId,
              gigId,
              brandId: gig.brandId,
              creatorId,
              platformFee,
              type: 'platform_fee',
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        // Create payment document
        const paymentData = {
          submissionId,
          gigId,
          brandId: gig.brandId,
          creatorId,
          basePayout,
          platformFee,
          creatorNet,
          stripe: {},
          status: 'balance_transferred',
          paymentMethod: 'balance',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          transferredAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (bonusAmount > 0) {
          paymentData.bonusAmount = bonusAmount;
        }
        if (reimbursementAmount > 0) {
          paymentData.reimbursementAmount = reimbursementAmount;
        }

        await db.collection('payments').add(paymentData);

        console.log(`  ✅ Processed payment for submission ${submissionId}: $${creatorNet.toFixed(2)} to creator`);
        processed++;
      } catch (error) {
        console.error(`  ❌ Error processing submission ${submissionId}:`, error.message);
        errors++;
      }
    }

    console.log(`\n✅ Complete!`);
    console.log(`  Processed: ${processed}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Errors: ${errors}`);
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

processApprovedPayments()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
