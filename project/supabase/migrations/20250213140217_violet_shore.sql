-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON teacher_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON teacher_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON teacher_profiles;

-- Create new RLS policies with fixed conditions
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

-- Add missing indexes
CREATE INDEX IF NOT EXISTS teacher_profiles_user_id_idx ON teacher_profiles(user_id);