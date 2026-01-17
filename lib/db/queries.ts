import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/client';

// Generic query helpers
export const getDocument = async <T>(
  collectionName: string,
  documentId: string
): Promise<T | null> => {
  const docRef = doc(db, collectionName, documentId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as T;
  }

  return null;
};

export const getCollection = async <T>(
  collectionName: string,
  constraints: any[] = [],
  customQuery?: any
): Promise<T[]> => {
  const q = customQuery || query(collection(db, collectionName), ...constraints);
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as any)
  } as T));
};

// User queries
export const getUserById = (userId: string) =>
  getDocument('users', userId);

export const getCreatorById = (creatorId: string) =>
  getDocument('creators', creatorId);

export const getBrandById = (brandId: string) =>
  getDocument('brands', brandId);

// Campaign queries
export const getPublishedCampaigns = (lastDoc?: QueryDocumentSnapshot) => {
  let q = query(
    collection(db, 'campaigns'),
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  return getCollection('campaigns', [], q);
};

export const getCampaignById = (campaignId: string) =>
  getDocument('campaigns', campaignId);

export const getCampaignsByBrand = (brandId: string) =>
  getCollection('campaigns', [
    where('brandId', '==', brandId),
    orderBy('createdAt', 'desc')
  ]);

// Application queries
export const getApplicationsByCampaign = (campaignId: string) =>
  getCollection('campaigns/' + campaignId + '/applications', [
    orderBy('createdAt', 'desc')
  ]);

export const getApplicationsByCreator = (creatorId: string) =>
  getCollection('campaigns', [
    where('applications', 'array-contains', { creatorId }),
    orderBy('createdAt', 'desc')
  ]);

// Contract queries
export const getContractById = (contractId: string) =>
  getDocument('contracts', contractId);

export const getContractsByCreator = (creatorId: string) =>
  getCollection('contracts', [
    where('creatorId', '==', creatorId),
    orderBy('createdAt', 'desc')
  ]);

export const getContractsByBrand = (brandId: string) =>
  getCollection('contracts', [
    where('brandId', '==', brandId),
    orderBy('createdAt', 'desc')
  ]);

// Thread queries
export const getThreadById = (threadId: string) =>
  getDocument('threads', threadId);

export const getThreadsByParticipant = (userId: string) =>
  getCollection('threads', [
    where('participants', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  ]);