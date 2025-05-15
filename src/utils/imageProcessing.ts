/**
 * Resizes an image to a square (1:1) aspect ratio
 * @param file The image file to resize
 * @param size The desired size (width and height will be equal)
 * @returns Promise<File> A new file with the resized image
 */
export const resizeImageToSquare = async (file: File, size: number = 512): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    
    img.onload = () => {
      try {
        // Create a canvas with square dimensions
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        // Calculate dimensions to maintain aspect ratio
        const scale = Math.max(size / img.width, size / img.height);
        const x = (size - img.width * scale) / 2;
        const y = (size - img.height * scale) / 2;

        // Draw image centered on canvas
        ctx.drawImage(
          img,
          x, y,
          img.width * scale,
          img.height * scale
        );

        // Convert to blob
        canvas.toBlob((blob) => {
          if (!blob) {
            throw new Error('Could not create blob');
          }

          // Create new file from blob
          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });

          // Clean up the object URL
          URL.revokeObjectURL(objectUrl);
          resolve(resizedFile);
        }, file.type, 0.95); // 0.95 quality for good compression
      } catch (error) {
        // Clean up the object URL
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    img.onerror = (error) => {
      // Clean up the object URL
      URL.revokeObjectURL(objectUrl);
      console.error('Image load error:', error);
      reject(new Error('Could not load image. Please try a different file.'));
    };
  });
};

/**
 * Validates if a file is an image and checks its size
 * @param file The file to validate
 * @param maxSizeInMB Maximum file size in MB
 * @returns boolean Whether the file is valid
 */
export const validateImage = (file: File, maxSizeInMB: number = 5): boolean => {
  console.log('Validating file:', {
    name: file.name,
    type: file.type,
    size: file.size
  });

  // Check if file is an image (including GIF)
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    throw new Error(`File must be a JPG, PNG, WebP, or GIF image. Received: ${file.type}`);
  }

  // Check file size (convert MB to bytes)
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    throw new Error(`Image must be smaller than ${maxSizeInMB}MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
  }

  return true;
}; 