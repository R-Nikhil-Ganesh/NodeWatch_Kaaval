// src/utils/fileStorage.ts
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const FILE_STORAGE_DIR = FileSystem.documentDirectory + 'file_storage/';
const isWeb = Platform.OS === 'web';
const WEB_UNSUPPORTED_ERROR =
  'File storage to local filesystem is not available on the web build. Please run the native app (iOS/Android) or Expo Go/dev-client to persist files under file_storage.';

/**
 * Get the case-specific directory path
 */
export const getCaseDirectory = (caseName: string): string => {
  const safeCaseName = caseName.replace(/[^a-z0-9]/gi, '_');
  return FILE_STORAGE_DIR + safeCaseName + '/';
};

/**
 * Ensure file_storage and case directory exist
 */
export const ensureCaseDirectory = async (caseName: string): Promise<string> => {
  if (isWeb) {
    throw new Error(WEB_UNSUPPORTED_ERROR);
  }
  // Ensure main file_storage directory exists
  const fileStorageDirInfo = await FileSystem.getInfoAsync(FILE_STORAGE_DIR);
  if (!fileStorageDirInfo.exists) {
    await FileSystem.makeDirectoryAsync(FILE_STORAGE_DIR, { intermediates: true });
    console.log('Created file_storage directory');
  }
  
  // Ensure case-specific directory exists
  const caseDir = getCaseDirectory(caseName);
  const caseDirInfo = await FileSystem.getInfoAsync(caseDir);
  if (!caseDirInfo.exists) {
    await FileSystem.makeDirectoryAsync(caseDir, { intermediates: true });
    console.log('Created case directory:', caseDir);
  }
  
  return caseDir;
};

/**
 * Save an image to case directory
 */
export const saveImageToCase = async (
  sourceUri: string,
  caseName: string,
  fileName?: string
): Promise<string> => {
  if (isWeb) {
    throw new Error(WEB_UNSUPPORTED_ERROR);
  }
  const caseDir = await ensureCaseDirectory(caseName);
  
  // Generate filename if not provided
  const timestamp = Date.now();
  const extension = sourceUri.split('.').pop() || 'jpg';
  const finalFileName = fileName || `evidence_${timestamp}.${extension}`;
  const destinationUri = caseDir + finalFileName;
  
  // Copy file to destination
  await FileSystem.copyAsync({
    from: sourceUri,
    to: destinationUri
  });
  
  console.log('Image saved to:', destinationUri);
  return destinationUri;
};

/**
 * List all images in a case directory
 */
export const listCaseImages = async (caseName: string): Promise<string[]> => {
  try {
    if (isWeb) {
      throw new Error(WEB_UNSUPPORTED_ERROR);
    }
    const caseDir = getCaseDirectory(caseName);
    const dirInfo = await FileSystem.getInfoAsync(caseDir);
    
    if (!dirInfo.exists) {
      console.log('Case directory does not exist:', caseDir);
      return [];
    }
    
    const files = await FileSystem.readDirectoryAsync(caseDir);
    const imagePaths = files
      .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
      .map(file => caseDir + file);
    
    return imagePaths;
  } catch (error) {
    console.error('Error listing case images:', error);
    return [];
  }
};

/**
 * Delete a specific image
 */
export const deleteImage = async (imageUri: string): Promise<boolean> => {
  try {
    if (isWeb) {
      throw new Error(WEB_UNSUPPORTED_ERROR);
    }
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(imageUri);
      console.log('Image deleted:', imageUri);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
};

/**
 * Delete all images in a case directory
 */
export const deleteCaseDirectory = async (caseName: string): Promise<boolean> => {
  try {
    if (isWeb) {
      throw new Error(WEB_UNSUPPORTED_ERROR);
    }
    const caseDir = getCaseDirectory(caseName);
    const dirInfo = await FileSystem.getInfoAsync(caseDir);
    
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(caseDir, { idempotent: true });
      console.log('Case directory deleted:', caseDir);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting case directory:', error);
    return false;
  }
};

/**
 * Verify if an image exists
 */
export const verifyImage = async (imageUri: string): Promise<boolean> => {
  try {
    if (isWeb) {
      throw new Error(WEB_UNSUPPORTED_ERROR);
    }
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    return fileInfo.exists;
  } catch (error) {
    console.error('Error verifying image:', error);
    return false;
  }
};

/**
 * Get file storage statistics
 */
export const getStorageStats = async (): Promise<{
  totalCases: number;
  totalImages: number;
  caseDirectories: string[];
}> => {
  try {
    if (isWeb) {
      throw new Error(WEB_UNSUPPORTED_ERROR);
    }
    const fileStorageDirInfo = await FileSystem.getInfoAsync(FILE_STORAGE_DIR);
    
    if (!fileStorageDirInfo.exists) {
      return { totalCases: 0, totalImages: 0, caseDirectories: [] };
    }
    
    const caseDirs = await FileSystem.readDirectoryAsync(FILE_STORAGE_DIR);
    let totalImages = 0;
    
    for (const caseDir of caseDirs) {
      const images = await listCaseImages(caseDir);
      totalImages += images.length;
    }
    
    return {
      totalCases: caseDirs.length,
      totalImages,
      caseDirectories: caseDirs
    };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return { totalCases: 0, totalImages: 0, caseDirectories: [] };
  }
};
