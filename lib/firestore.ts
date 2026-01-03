import { db, isConfigured } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { MasterData } from '@/types';

const MASTER_DATA_DOC_ID = 'master_data_v1';
const COLLECTION_NAME = 'configurations';

/**
 * Save master data configuration to Firestore
 */
export async function saveMasterDataToFirestore(masterData: MasterData): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if Firebase is configured
    if (!isConfigured) {
      return {
        success: false,
        error: 'Firebase not configured. Please set up .env.local file with your Firebase credentials.'
      };
    }

    if (!db) {
      return {
        success: false,
        error: 'Firestore database not initialized. Check Firebase configuration.'
      };
    }

    const docRef = doc(db, COLLECTION_NAME, MASTER_DATA_DOC_ID);
    
    await setDoc(docRef, {
      ...masterData,
      lastSyncedAt: serverTimestamp(),
      version: 1,
    });

    return { success: true };
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to save configuration' 
    };
  }
}

/**
 * Load master data configuration from Firestore
 */
export async function loadMasterDataFromFirestore(): Promise<{ 
  success: boolean; 
  data?: MasterData; 
  error?: string 
}> {
  try {
    // Check if Firebase is configured
    if (!isConfigured) {
      return {
        success: false,
        error: 'Firebase not configured. Please set up .env.local file with your Firebase credentials.'
      };
    }

    if (!db) {
      return {
        success: false,
        error: 'Firestore database not initialized. Check Firebase configuration.'
      };
    }

    const docRef = doc(db, COLLECTION_NAME, MASTER_DATA_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Remove Firestore metadata
      const { lastSyncedAt, version, ...masterData } = data;
      
      return { 
        success: true, 
        data: masterData as MasterData 
      };
    } else {
      return { 
        success: false, 
        error: 'No configuration found in database' 
      };
    }
  } catch (error) {
    console.error('Error loading from Firestore:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to load configuration' 
    };
  }
}

/**
 * Check if Firestore configuration exists
 */
export async function checkFirestoreConfigExists(): Promise<boolean> {
  try {
    if (!isConfigured || !db) {
      return false;
    }
    
    const docRef = doc(db, COLLECTION_NAME, MASTER_DATA_DOC_ID);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    console.error('Error checking Firestore config:', error);
    return false;
  }
}
