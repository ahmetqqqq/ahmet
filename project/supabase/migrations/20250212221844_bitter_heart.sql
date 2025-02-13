/*
  # Dersler ve Kaynaklar için Veritabanı Şeması

  1. Yeni Tablolar
    - `subjects` (Konular)
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `description` (text)
      - `objectives` (text array)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `lesson_resources` (Ders Kaynakları)
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `description` (text)
      - `subject` (uuid, foreign key)
      - `file_url` (text)
      - `link_url` (text)
      - `tags` (text array)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Güvenlik
    - Her iki tablo için RLS aktif
    - Kimlik doğrulaması yapılmış kullanıcılar için CRUD politikaları
    - Dosya yükleme ve indirme için storage politikaları

  3. Storage
    - Kaynak dosyaları için 'resources' bucket'ı
*/

-- Konular tablosu
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  objectives text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Kaynaklar tablosu
CREATE TABLE IF NOT EXISTS lesson_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  subject uuid REFERENCES subjects(id),
  file_url text,
  link_url text,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_resources ENABLE ROW LEVEL SECURITY;

-- Policies for subjects
CREATE POLICY "Users can view all subjects"
  ON subjects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert subjects"
  ON subjects
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update subjects"
  ON subjects
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete subjects"
  ON subjects
  FOR DELETE
  TO authenticated
  USING (true);

-- Policies for lesson_resources
CREATE POLICY "Users can view all resources"
  ON lesson_resources
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert resources"
  ON lesson_resources
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update resources"
  ON lesson_resources
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete resources"
  ON lesson_resources
  FOR DELETE
  TO authenticated
  USING (true);

-- Create storage bucket for resource files if not exists
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('resources', 'resources', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'resources');

-- Allow authenticated users to download files
CREATE POLICY "Authenticated users can download files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'resources');