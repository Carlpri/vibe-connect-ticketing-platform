import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AppError } from '../errors/AppError';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export interface ValidatedImage {
  buffer: Buffer;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  extension: 'jpg' | 'png' | 'webp';
}

export function getUploadsDirectory(): string {
  const configuredDirectory = process.env.UPLOADS_DIR?.trim();
  return configuredDirectory
    ? path.resolve(configuredDirectory)
    : path.join(process.cwd(), 'uploads');
}

/**
 * Validates actual binary content using magic bytes.
 */
export function validateImageMagicBytes(buffer: Buffer): ValidatedImage {
  if (buffer.length < 12) {
    throw new AppError('File is too small to be a valid image', 400);
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new AppError('Image file size exceeds the 5MB maximum limit', 400);
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { buffer, mimeType: 'image/jpeg', extension: 'jpg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { buffer, mimeType: 'image/png', extension: 'png' };
  }

  // WebP: 'RIFF' .... 'WEBP'
  const isRiff = buffer.toString('ascii', 0, 4) === 'RIFF';
  const isWebp = buffer.toString('ascii', 8, 12) === 'WEBP';
  if (isRiff && isWebp) {
    return { buffer, mimeType: 'image/webp', extension: 'webp' };
  }

  throw new AppError('Unsupported image format. Allowed formats are JPEG, PNG, and WebP', 400);
}

/**
 * Parses dataURL or base64 string to Buffer and validates it.
 */
export function parseAndValidateBase64Image(dataUrl: string): ValidatedImage {
  if (!dataUrl || typeof dataUrl !== 'string') {
    throw new AppError('Invalid image data provided', 400);
  }

  const base64Data = dataUrl.includes(';base64,') ? dataUrl.split(';base64,')[1] : dataUrl;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Data, 'base64');
  } catch {
    throw new AppError('Could not decode image base64 data', 400);
  }

  return validateImageMagicBytes(buffer);
}

/**
 * Saves a validated image buffer to the local uploads directory.
 */
export async function saveImageToUploads(image: ValidatedImage, subDir: string = 'flyers'): Promise<string> {
  const uploadsDir = path.join(getUploadsDirectory(), subDir);
  await fs.promises.mkdir(uploadsDir, { recursive: true });

  const filename = `${crypto.randomUUID()}.${image.extension}`;
  const filepath = path.join(uploadsDir, filename);

  await fs.promises.writeFile(filepath, image.buffer);
  return `/uploads/${subDir}/${filename}`;
}
