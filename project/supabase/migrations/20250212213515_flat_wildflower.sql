/*
  # Fix delete policies for students and lessons tables

  1. Changes
    - Drop existing delete policies if they exist
    - Re-create DELETE policies for students table
    - Re-create DELETE policies for lessons table
  
  2. Security
    - Teachers can only delete their own students
    - Teachers can only delete lessons of their students
*/

-- Varolan politikaları kaldır
DROP POLICY IF EXISTS "Teachers can delete their own students" ON students;
DROP POLICY IF EXISTS "Teachers can delete lessons of their students" ON lessons;

-- Öğrenciler için silme politikası
CREATE POLICY "Teachers can delete their own students"
  ON students
  FOR DELETE
  TO authenticated
  USING (teacher_id IN (
    SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
  ));

-- Dersler için silme politikası
CREATE POLICY "Teachers can delete lessons of their students"
  ON lessons
  FOR DELETE
  TO authenticated
  USING (student_id IN (
    SELECT id FROM students WHERE teacher_id IN (
      SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
    )
  ));