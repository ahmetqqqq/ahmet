/*
  # Add delete policies for students and lessons tables

  1. Changes
    - Add DELETE policy for students table
    - Add DELETE policy for lessons table
  
  2. Security
    - Teachers can only delete their own students
    - Teachers can only delete lessons of their students
*/

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