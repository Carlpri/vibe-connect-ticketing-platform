const { PrismaClient } = require('../node_modules/@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    // 1. Ensure bucket exists and is public
    await prisma.$queryRawUnsafe(`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES ('flyers', 'flyers', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
      ON CONFLICT (id) DO UPDATE SET public = true;
    `);

    // 2. Allow public SELECT access to flyers
    await prisma.$queryRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access to Flyers'
        ) THEN
          CREATE POLICY "Public Access to Flyers"
          ON storage.objects FOR SELECT
          USING (bucket_id = 'flyers');
        END IF;
      END $$;
    `);

    console.log('Bucket & RLS policy configured successfully!');
  } catch (err) {
    console.error('Error configuring storage:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
