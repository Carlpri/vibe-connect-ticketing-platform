import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import { createClient } from '@supabase/supabase-js';
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

export function createCloudinarySignature(parameters: Record<string, string | number>, apiSecret: string): string {
  const signedParameters = Object.entries(parameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return crypto.createHash('sha1').update(`${signedParameters}${apiSecret}`).digest('hex');
}

async function uploadImageToCloudinary(
  image: ValidatedImage,
  cloudName: string,
  apiKey: string,
  apiSecret: string,
  folder: string
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = crypto.randomUUID();
  const parameters = { folder, public_id: publicId, timestamp };
  const signature = createCloudinarySignature(parameters, apiSecret);
  const boundary = `----vibe-connect-${crypto.randomUUID()}`;
  const fields: Record<string, string> = {
    ...Object.fromEntries(Object.entries(parameters).map(([key, value]) => [key, String(value)])),
    api_key: apiKey,
    signature,
  };
  const bodyParts: Buffer[] = [];

  for (const [key, value] of Object.entries(fields)) {
    bodyParts.push(
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`)
    );
  }
  bodyParts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${publicId}.${image.extension}"\r\nContent-Type: ${image.mimeType}\r\n\r\n`
    ),
    image.buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  );
  const body = Buffer.concat(bodyParts);
  const requestUrl = new URL(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`
  );

  return new Promise((resolve, reject) => {
    const request = https.request(
      requestUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
      },
      (response) => {
        const responseParts: Buffer[] = [];
        response.on('data', (part: Buffer | string) => {
          responseParts.push(Buffer.isBuffer(part) ? part : Buffer.from(part));
        });
        response.on('error', reject);
        response.on('end', () => {
          let result: { secure_url?: string; error?: { message?: string } };
          try {
            result = JSON.parse(Buffer.concat(responseParts).toString('utf8'));
          } catch {
            reject(new AppError('Cloudinary returned an invalid upload response', 502));
            return;
          }

          if (
            response.statusCode !== undefined &&
            response.statusCode >= 200 &&
            response.statusCode < 300 &&
            typeof result.secure_url === 'string'
          ) {
            resolve(result.secure_url);
            return;
          }

          console.error('Cloudinary upload failed:', {
            statusCode: response.statusCode,
            message: result.error?.message,
          });
          reject(new AppError('Flyer upload to Cloudinary failed', 502));
        });
      }
    );

    request.setTimeout(30_000, () => request.destroy(new Error('Cloudinary upload timed out')));
    request.on('error', (error) => {
      console.error('Cloudinary upload request failed:', error.message);
      reject(new AppError('Flyer upload to Cloudinary failed', 502));
    });
    request.end(body);
  });
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
 * Saves a validated image to Cloudinary when configured, otherwise to Supabase Storage
 * or local uploads outside production.
 */
export async function saveImageToUploads(image: ValidatedImage, subDir: string = 'flyers'): Promise<string> {
  const cloudinaryUrl = process.env.CLOUDINARY_URL?.trim();
  const configuredCloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const configuredApiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const configuredApiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  const directConfiguration = [configuredCloudName, configuredApiKey, configuredApiSecret];
  const directConfigurationCount = directConfiguration.filter(Boolean).length;

  if (directConfigurationCount > 0 && directConfigurationCount < directConfiguration.length) {
    throw new AppError('Cloudinary storage is incompletely configured', 500);
  }

  let cloudName = configuredCloudName;
  let cloudinaryApiKey = configuredApiKey;
  let cloudinaryApiSecret = configuredApiSecret;

  if (directConfigurationCount === 0 && cloudinaryUrl) {
    try {
      const parsedUrl = new URL(cloudinaryUrl);
      if (parsedUrl.protocol !== 'cloudinary:') {
        throw new Error('Unsupported Cloudinary URL protocol');
      }

      cloudName = parsedUrl.hostname;
      cloudinaryApiKey = decodeURIComponent(parsedUrl.username);
      cloudinaryApiSecret = decodeURIComponent(parsedUrl.password);
    } catch {
      throw new AppError('CLOUDINARY_URL is invalid', 500);
    }

    if (!cloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
      throw new AppError('CLOUDINARY_URL is incomplete', 500);
    }
  }

  if (cloudName && cloudinaryApiKey && cloudinaryApiSecret) {
    const folder = process.env.CLOUDINARY_FOLDER?.trim() || 'vibe-connect/events';
    return uploadImageToCloudinary(image, cloudName, cloudinaryApiKey, cloudinaryApiSecret, folder);
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)?.trim();
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET?.trim() || 'flyers';

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });
      const filename = `${crypto.randomUUID()}.${image.extension}`;

      const { error } = await supabase.storage
        .from(bucketName)
        .upload(filename, image.buffer, {
          contentType: image.mimeType,
          upsert: true,
        });

      if (error) {
        console.error('Supabase Storage upload error:', error.message);
        throw new AppError('Flyer upload to persistent storage failed', 500);
      }

      const { data: publicData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filename);

      if (!publicData?.publicUrl) {
        throw new AppError('Persistent storage did not return a flyer URL', 500);
      }

      return publicData.publicUrl;
    } catch (supabaseError: unknown) {
      console.error('Supabase Storage exception:', supabaseError);
      if (supabaseError instanceof AppError) throw supabaseError;
      throw new AppError('Flyer upload to persistent storage failed', 500);
    }
  } else if (process.env.NODE_ENV === 'production') {
    throw new AppError('Persistent image storage is not configured', 500);
  }

  // Local uploads are only suitable for development and tests.
  const uploadsDir = path.join(getUploadsDirectory(), subDir);
  await fs.promises.mkdir(uploadsDir, { recursive: true });

  const filename = `${crypto.randomUUID()}.${image.extension}`;
  const filepath = path.join(uploadsDir, filename);

  await fs.promises.writeFile(filepath, image.buffer);
  return `/uploads/${subDir}/${filename}`;
}
