import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import {
  createCloudinarySignature,
  getUploadsDirectory,
  saveImageToUploads,
} from '../shared/utils/imageUpload';

describe('uploads storage directory', () => {
  it('creates a Cloudinary signature from alphabetically sorted upload parameters', () => {
    const signature = createCloudinarySignature(
      { timestamp: 1315060510, public_id: 'sample', folder: 'events' },
      'secret'
    );
    const reorderedSignature = createCloudinarySignature(
      { folder: 'events', public_id: 'sample', timestamp: 1315060510 },
      'secret'
    );

    assert.equal(signature, reorderedSignature);
    assert.match(signature, /^[a-f0-9]{40}$/);
  });

  it('uses the configured persistent directory', () => {
    const previousDirectory = process.env.UPLOADS_DIR;
    const configuredDirectory = path.join(process.cwd(), 'persistent-media', 'uploads');

    process.env.UPLOADS_DIR = configuredDirectory;
    try {
      assert.equal(getUploadsDirectory(), path.resolve(configuredDirectory));
    } finally {
      if (previousDirectory === undefined) {
        delete process.env.UPLOADS_DIR;
      } else {
        process.env.UPLOADS_DIR = previousDirectory;
      }
    }
  });

  it('refuses production flyer uploads without persistent storage configured', async () => {
    const previousEnvironment = {
      nodeEnv: process.env.NODE_ENV,
      supabaseUrl: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      anonKey: process.env.SUPABASE_ANON_KEY,
    };

    process.env.NODE_ENV = 'production';
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_ANON_KEY;

    try {
      await assert.rejects(
        saveImageToUploads({
          buffer: Buffer.alloc(12),
          mimeType: 'image/jpeg',
          extension: 'jpg',
        }),
        /Persistent image storage is not configured/
      );
    } finally {
      if (previousEnvironment.nodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousEnvironment.nodeEnv;

      if (previousEnvironment.supabaseUrl === undefined) delete process.env.SUPABASE_URL;
      else process.env.SUPABASE_URL = previousEnvironment.supabaseUrl;

      if (previousEnvironment.serviceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      else process.env.SUPABASE_SERVICE_ROLE_KEY = previousEnvironment.serviceRoleKey;

      if (previousEnvironment.anonKey === undefined) delete process.env.SUPABASE_ANON_KEY;
      else process.env.SUPABASE_ANON_KEY = previousEnvironment.anonKey;
    }
  });
});
