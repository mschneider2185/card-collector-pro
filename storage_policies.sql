-- Storage RLS Policies for Card Collector Pro
-- Run this in Supabase SQL Editor after creating the buckets.
--
-- Bucket layout:
--   card-uploads  (private)  {user_id}/front_<ts>.<ext>  {user_id}/back_<ts>.<ext>
--   card-images   (public)   {upload_id}/front.<ext>      {upload_id}/back.<ext>
--   avatars       (public)   {user_id}/avatar.<ext>
--
-- card-uploads objects are written by the browser (anon/authed client).
-- card-images objects are written by the API route using the service-role key,
--   so no INSERT policy is needed there for the client.
-- avatars are written by the client for profile pictures.

-- ============================================================
-- card-uploads  (private bucket)
-- ============================================================

-- Users can upload into their own folder
DROP POLICY IF EXISTS "card-uploads: user insert" ON storage.objects;
CREATE POLICY "card-uploads: user insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'card-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own uploads
DROP POLICY IF EXISTS "card-uploads: user select" ON storage.objects;
CREATE POLICY "card-uploads: user select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'card-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own uploads
DROP POLICY IF EXISTS "card-uploads: user delete" ON storage.objects;
CREATE POLICY "card-uploads: user delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'card-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- card-images  (public bucket — written by service role only)
-- ============================================================

-- Anyone (including unauthenticated) can read processed card images
DROP POLICY IF EXISTS "card-images: public select" ON storage.objects;
CREATE POLICY "card-images: public select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'card-images');

-- ============================================================
-- avatars  (public bucket)
-- ============================================================

-- Anyone can read avatars
DROP POLICY IF EXISTS "avatars: public select" ON storage.objects;
CREATE POLICY "avatars: public select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Users can upload/update their own avatar
DROP POLICY IF EXISTS "avatars: user insert" ON storage.objects;
CREATE POLICY "avatars: user insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars: user update" ON storage.objects;
CREATE POLICY "avatars: user update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars: user delete" ON storage.objects;
CREATE POLICY "avatars: user delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- Verification
-- ============================================================

SELECT
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;
