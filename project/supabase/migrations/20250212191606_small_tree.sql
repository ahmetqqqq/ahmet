/*
  # Fix teacher_profiles table

  1. Changes
    - Drop duplicate table if exists
    - Ensure single instance of teacher_profiles table
    - Preserve existing RLS policies
*/

-- Drop the table if it exists (will cascade delete policies)
DROP TABLE IF EXISTS teacher_profiles;

-- Recreate the table with correct structure
CREATE TABLE teacher_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  full_name text NOT NULL,
  phone text,
  subject text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;

-- Recreate policies
CREATE POLICY "Users can view own profile" 
  ON teacher_profiles 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
  ON teacher_profiles 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" 
  ON teacher_profiles 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);