import admin, { adminDb } from '@/lib/firebase/admin';

/**
 * Gets the current balance for a user (creator or brand)
 */
export async function getBalance(userId: string, userType: 'creator' | 'brand'): Promise<number> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  const collection = userType === 'creator' ? 'creators' : 'brands';
  const userDoc = await adminDb.collection(collection).doc(userId).get();
  
  if (!userDoc.exists) {
    throw new Error(`${userType} not found: ${userId}`);
  }

  const userData = userDoc.data();
  return userData?.balance || 0;
}

/**
 * Gets or creates the BANK account (special brand account for platform fees)
 */
export async function getOrCreateBankAccount(): Promise<string> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  const BANK_ID = 'BANK';
  const bankRef = adminDb.collection('brands').doc(BANK_ID);
  const bankDoc = await bankRef.get();

  if (!bankDoc.exists) {
    // Create BANK account if it doesn't exist
    await bankRef.set({
      uid: BANK_ID,
      companyName: 'Platform Bank',
      balance: 0,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('BANK account created');
  }

  return BANK_ID;
}

/**
 * Updates the balance for a user (creator or brand)
 * Uses Firestore transactions to ensure atomicity
 */
export async function updateBalance(
  userId: string,
  userType: 'creator' | 'brand',
  amount: number,
  reason: string,
  metadata?: Record<string, any>
): Promise<number> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  const collection = userType === 'creator' ? 'creators' : 'brands';
  
  // Use transaction to ensure atomicity
  const newBalance = await adminDb.runTransaction(async (transaction) => {
    const userRef = adminDb.collection(collection).doc(userId);
    const userDoc = await transaction.get(userRef);
    
    if (!userDoc.exists) {
      throw new Error(`${userType} not found: ${userId}`);
    }

    const userData = userDoc.data();
    const currentBalance = userData?.balance || 0;
    const newBalance = currentBalance + amount;

    // Ensure balance doesn't go negative for brands (except BANK which can go negative)
    if (userType === 'brand' && userId !== 'BANK' && newBalance < 0) {
      throw new Error(`Insufficient balance. Current: $${currentBalance.toFixed(2)}, Required: $${Math.abs(amount).toFixed(2)}`);
    }

    transaction.update(userRef, {
      balance: newBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return newBalance;
  });

  // Create balance transaction record
  await adminDb.collection('balanceTransactions').add({
    userId,
    userType,
    amount,
    balanceBefore: newBalance - amount,
    balanceAfter: newBalance,
    reason,
    metadata: metadata || {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Balance updated for ${userType} ${userId}: ${amount > 0 ? '+' : ''}$${amount.toFixed(2)} (New balance: $${newBalance.toFixed(2)})`);
  
  return newBalance;
}

/**
 * Transfers balance from brand to creator
 */
export async function transferBalance(
  brandId: string,
  creatorId: string,
  amount: number,
  reason: string,
  metadata?: Record<string, any>
): Promise<{ brandBalance: number; creatorBalance: number }> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  if (amount <= 0) {
    throw new Error('Transfer amount must be positive');
  }

  // Use transaction to ensure both updates succeed or both fail
  const result = await adminDb.runTransaction(async (transaction) => {
    const brandRef = adminDb.collection('brands').doc(brandId);
    const creatorRef = adminDb.collection('creators').doc(creatorId);

    const [brandDoc, creatorDoc] = await Promise.all([
      transaction.get(brandRef),
      transaction.get(creatorRef),
    ]);

    if (!brandDoc.exists) {
      throw new Error(`Brand not found: ${brandId}`);
    }
    if (!creatorDoc.exists) {
      throw new Error(`Creator not found: ${creatorId}`);
    }

    const brandData = brandDoc.data();
    const creatorData = creatorDoc.data();

    const brandBalance = brandData?.balance || 0;
    const creatorBalance = creatorData?.balance || 0;

    // Check if brand has sufficient balance
    if (brandBalance < amount) {
      throw new Error(`Insufficient brand balance. Current: $${brandBalance.toFixed(2)}, Required: $${amount.toFixed(2)}`);
    }

    const newBrandBalance = brandBalance - amount;
    const newCreatorBalance = creatorBalance + amount;

    // Update both balances atomically
    transaction.update(brandRef, {
      balance: newBrandBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    transaction.update(creatorRef, {
      balance: newCreatorBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      brandBalance: newBrandBalance,
      creatorBalance: newCreatorBalance,
    };
  });

  // Create transfer record
  await adminDb.collection('balanceTransactions').add({
    brandId,
    creatorId,
    amount,
    brandBalanceBefore: result.brandBalance + amount,
    brandBalanceAfter: result.brandBalance,
    creatorBalanceBefore: result.creatorBalance - amount,
    creatorBalanceAfter: result.creatorBalance,
    reason,
    metadata: metadata || {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Balance transferred: $${amount.toFixed(2)} from brand ${brandId} to creator ${creatorId}`);
  console.log(`Brand balance: $${result.brandBalance.toFixed(2)}, Creator balance: $${result.creatorBalance.toFixed(2)}`);

  return result;
}
