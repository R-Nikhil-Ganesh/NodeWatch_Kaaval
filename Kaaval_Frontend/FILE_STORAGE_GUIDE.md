# File Storage Implementation

## Overview

The application now implements local file storage for uploaded evidence images. All images are organized in a structured directory system based on case names.

## Directory Structure

```
DocumentDirectory/
└── file_storage/
    ├── Case_Title_1/
    │   ├── evidence_1234567890.jpg
    │   ├── evidence_1234567891.png
    │   └── evidence_1234567892.jpg
    ├── Case_Title_2/
    │   └── evidence_1234567893.jpg
    └── Case_Title_3/
        ├── evidence_1234567894.png
        └── evidence_1234567895.jpg
```

## Implementation Details

### File Storage Utility (`src/utils/fileStorage.ts`)

A comprehensive utility module that handles all file storage operations:

#### Functions

1. **`getCaseDirectory(caseName: string): string`**
   - Returns the path to a case-specific directory
   - Sanitizes case name to be filesystem-safe

2. **`ensureCaseDirectory(caseName: string): Promise<string>`**
   - Creates file_storage and case directories if they don't exist
   - Returns the case directory path

3. **`saveImageToCase(sourceUri, caseName, fileName?): Promise<string>`**
   - Saves an image to the case directory
   - Auto-generates filename if not provided
   - Returns the saved image path

4. **`listCaseImages(caseName: string): Promise<string[]>`**
   - Lists all images in a case directory
   - Returns array of image paths

5. **`deleteImage(imageUri: string): Promise<boolean>`**
   - Deletes a specific image
   - Returns success status

6. **`deleteCaseDirectory(caseName: string): Promise<boolean>`**
   - Deletes entire case directory and all images
   - Returns success status

7. **`verifyImage(imageUri: string): Promise<boolean>`**
   - Checks if an image exists
   - Returns existence status

8. **`getStorageStats(): Promise<{...}>`**
   - Returns storage statistics
   - Total cases, total images, case directories

### EvidenceScreen Integration

The EvidenceScreen component has been enhanced with file storage functionality:

#### On Image Upload (`analyzeDocument`)

1. User selects/takes a photo
2. Image is saved to `file_storage/[case_name]/` with unique filename
3. Saved file path is stored in Evidence object
4. Evidence registered on blockchain with file path
5. Image persists even after app restart

#### On Screen Load (`useEffect`)

1. Component verifies all evidence images exist
2. Logs warnings for missing images
3. Confirms successfully loaded images

#### Image Display

- Images are loaded from `file_storage` paths
- If image doesn't exist, placeholder or error handling occurs
- All images persist across app sessions

## Usage Examples

### Save Image When Uploading Evidence

```typescript
import { saveImageToCase } from '../utils/fileStorage';

const analyzeDocument = async (asset: ImagePicker.ImagePickerAsset) => {
  const caseName = activeCase?.title || caseId;
  const savedUri = await saveImageToCase(asset.uri, caseName);
  
  const newEvidence: Evidence = {
    type: 'image',
    uri: savedUri, // File storage path
    // ... other fields
  };
  
  await updateCaseEvidence(caseId, newEvidence);
};
```

### Verify Image Exists on Load

```typescript
import { verifyImage } from '../utils/fileStorage';

useEffect(() => {
  const checkImages = async () => {
    for (const evidence of activeCase.evidence) {
      const exists = await verifyImage(evidence.uri);
      if (!exists) {
        console.warn('Missing image:', evidence.uri);
      }
    }
  };
  checkImages();
}, [activeCase]);
```

### List All Case Images

```typescript
import { listCaseImages } from '../utils/fileStorage';

const images = await listCaseImages('Case_Title_1');
console.log('Case has', images.length, 'images');
```

### Delete Case When Closed

```typescript
import { deleteCaseDirectory } from '../utils/fileStorage';

const closeCase = async (caseName: string) => {
  await deleteCaseDirectory(caseName);
  console.log('Case files deleted');
};
```

## Benefits

### ✅ Organized Storage
- Each case has its own folder
- Easy to locate evidence by case
- Clean directory structure

### ✅ Persistence
- Images survive app restarts
- Data remains even after cache clear
- No reliance on temporary storage

### ✅ Blockchain Integration
- File paths stored on blockchain
- Evidence integrity maintained
- Audit trail includes file locations

### ✅ Easy Management
- Simple utility functions
- Delete individual images
- Delete entire case directories
- Get storage statistics

### ✅ Error Handling
- Verifies images exist on load
- Handles missing files gracefully
- Logs warnings for debugging

## File Naming Convention

Evidence images are saved with timestamp-based naming:

```
evidence_[timestamp].[extension]
```

Example:
```
evidence_1642334567890.jpg
evidence_1642334567891.png
```

This ensures:
- Unique filenames (no collisions)
- Chronological ordering
- Original extension preserved

## Storage Location

### iOS
```
/var/mobile/Containers/Data/Application/[APP_ID]/Documents/file_storage/
```

### Android
```
/data/data/[PACKAGE_NAME]/files/file_storage/
```

### Web
```
Browser IndexedDB / Local Storage
(Limited support - not recommended for production)
```

## Best Practices

### 1. Always Use Utility Functions
```typescript
// ✅ Good
import { saveImageToCase } from '../utils/fileStorage';
const uri = await saveImageToCase(sourceUri, caseName);

// ❌ Bad
const uri = FileSystem.documentDirectory + 'file_storage/' + caseName + '/image.jpg';
```

### 2. Verify Images Before Display
```typescript
// ✅ Good
const exists = await verifyImage(evidence.uri);
if (exists) {
  <Image source={{ uri: evidence.uri }} />
}

// ❌ Bad
<Image source={{ uri: evidence.uri }} />
```

### 3. Handle Errors Gracefully
```typescript
// ✅ Good
try {
  const uri = await saveImageToCase(sourceUri, caseName);
  return uri;
} catch (error) {
  console.error('Save failed:', error);
  return null;
}
```

### 4. Clean Up When Needed
```typescript
// When case is archived/deleted
await deleteCaseDirectory(caseName);
```

## Troubleshooting

### Images Not Appearing

**Symptom**: Image component shows blank or error

**Solution**:
1. Check console for "Image not found" warnings
2. Verify file_storage directory exists
3. Check case name matches directory name
4. Ensure image was saved properly

```typescript
const exists = await verifyImage(imageUri);
console.log('Image exists:', exists);
```

### Storage Full

**Symptom**: "No space left on device" error

**Solution**:
1. Check storage statistics
2. Delete old/archived cases
3. Implement cleanup policy

```typescript
const stats = await getStorageStats();
console.log('Total images:', stats.totalImages);
```

### Permission Errors

**Symptom**: "Permission denied" when saving

**Solution**:
1. Request media library permissions
2. Check app permissions in device settings
3. Ensure DocumentDirectory is accessible

```typescript
const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
if (status !== 'granted') {
  Alert.alert('Permission required');
}
```

## Future Enhancements

### Potential Improvements

1. **Image Compression**
   - Reduce file sizes before saving
   - Maintain quality while saving space

2. **Cloud Sync**
   - Backup to cloud storage
   - Sync across devices
   - Remote evidence access

3. **Encryption**
   - Encrypt images at rest
   - Decrypt on display
   - Enhanced security

4. **Thumbnail Generation**
   - Create small previews
   - Faster loading
   - Reduced memory usage

5. **Automatic Cleanup**
   - Delete old evidence after X days
   - Archive completed cases
   - Storage optimization

## Technical Notes

- Uses Expo FileSystem API
- Compatible with iOS and Android
- Works offline (no internet required)
- Images stored in app's private storage
- Not accessible by other apps (security)
- Backed up by device backup systems

## Migration Guide

If you have existing evidence with old URIs:

```typescript
// Migration utility (run once)
const migrateOldEvidence = async () => {
  for (const case of cases) {
    for (const evidence of case.evidence) {
      if (evidence.uri && !evidence.uri.includes('file_storage')) {
        // Old URI format - migrate
        const newUri = await saveImageToCase(
          evidence.uri,
          case.title
        );
        evidence.uri = newUri;
      }
    }
  }
  await saveCases(cases);
};
```

---

**Implementation Date**: January 2026  
**Version**: 1.0.0  
**Status**: ✅ Complete and Tested
