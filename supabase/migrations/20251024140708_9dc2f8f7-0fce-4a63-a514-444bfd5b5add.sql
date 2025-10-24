-- Create storage bucket for certificates
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificates',
  'certificates',
  false,
  10485760,
  ARRAY['application/pdf']
);

-- Create RLS policies for certificates bucket
CREATE POLICY "COE can upload certificates"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'certificates' AND
  has_role(auth.uid(), 'coe'::app_role)
);

CREATE POLICY "Students can view own certificates"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'certificates' AND
  (storage.foldername(name))[1] = get_user_usn(auth.uid())
);

CREATE POLICY "COE can view all certificates"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'certificates' AND
  has_role(auth.uid(), 'coe'::app_role)
);