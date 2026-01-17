import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Stripe webhook handler
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'account.updated':
        await handleConnectAccountUpdated(event.data.object as Stripe.Account);
        break;

      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Internal server error');
  }
});

// Contract state transition function
export const transitionContract = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { contractId, newStatus, metadata } = data;

  // Get contract
  const contractRef = admin.firestore().doc(`contracts/${contractId}`);
  const contractSnap = await contractRef.get();

  if (!contractSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Contract not found');
  }

  const contract = contractSnap.data();

  // Verify user has permission to transition this contract
  if (contract!.brandId !== context.auth.uid && contract!.creatorId !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'User not authorized for this contract');
  }

  // Validate state transition
  const validTransitions: Record<string, string[]> = {
    'pending_payment': ['active', 'cancelled'],
    'active': ['delivering', 'cancelled'],
    'delivering': ['approved', 'disputed'],
    'approved': ['completed'],
    'disputed': ['approved', 'cancelled'],
  };

  if (!validTransitions[contract!.status]?.includes(newStatus)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid state transition');
  }

  // Update contract status
  await contractRef.update({
    status: newStatus,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Log the transition
  await admin.firestore().collection('adminLogs').add({
    actorId: context.auth.uid,
    action: 'contract_status_changed',
    targetType: 'contract',
    targetId: contractId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    metadata: {
      oldStatus: contract!.status,
      newStatus,
      ...metadata,
    },
  });

  return { success: true };
});

// Webhook handlers
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const contractId = session.metadata?.contractId;
  const milestoneId = session.metadata?.milestoneId;

  if (!contractId || !milestoneId) {
    console.error('Missing contractId or milestoneId in session metadata');
    return;
  }

  // Update milestone status to funded
  await admin.firestore()
    .doc(`contracts/${contractId}/milestones/${milestoneId}`)
    .update({
      status: 'funded',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  // If this is the first milestone, transition contract to active
  const contractRef = admin.firestore().doc(`contracts/${contractId}`);
  const contractSnap = await contractRef.get();
  const contract = contractSnap.data();

  if (contract?.status === 'pending_payment') {
    await contractRef.update({
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // Handle payment intent success if needed
  console.log('Payment intent succeeded:', paymentIntent.id);
}

async function handleConnectAccountUpdated(account: Stripe.Account) {
  const creatorId = account.metadata?.creatorId;

  if (!creatorId) {
    console.error('Missing creatorId in account metadata');
    return;
  }

  // Update creator's Stripe onboarding status
  await admin.firestore()
    .doc(`creators/${creatorId}`)
    .update({
      'stripe.onboardingComplete': account.details_submitted,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

async function handlePayoutPaid(payout: Stripe.Payout) {
  // Log payout completion
  console.log('Payout completed:', payout.id);
}