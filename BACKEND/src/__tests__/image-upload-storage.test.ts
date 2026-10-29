import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { getUploadsDirectory } from '../shared/utils/imageUpload';

describe('uploads storage directory', () => {
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
});
