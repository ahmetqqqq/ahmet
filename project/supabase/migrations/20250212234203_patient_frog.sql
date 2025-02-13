/*
  # Fix Reports Data Access

  1. New Indexes
    - Add indexes for faster report queries
    - Optimize performance for common report operations

  2. Security
    - Add missing RLS policies for report-related queries
    - Ensure proper access control for all report data

  3. Data Integrity
    - Add constraints to ensure data consistency
    - Prevent invalid data states
*/

-- Add indexes for report queries
CREATE INDEX IF NOT EXISTS lessons_created_at_idx ON lessons(created_at);
CREATE INDEX IF NOT EXISTS payments_payment_date_idx ON payments(payment_date);
CREATE INDEX IF NOT EXISTS lessons_status_idx ON lessons(status);

-- Add composite indexes for common report queries
CREATE INDEX IF NOT EXISTS lessons_student_status_idx ON lessons(student_id, status);
CREATE INDEX IF NOT EXISTS payments_student_status_idx ON payments(student_id, status);

-- Ensure proper constraints
ALTER TABLE lessons 
  ADD CONSTRAINT IF NOT EXISTS check_lesson_status 
  CHECK (status IS NULL OR status IN ('completed', 'postponed', 'cancelled'));

ALTER TABLE payments 
  ADD CONSTRAINT IF NOT EXISTS check_payment_status 
  CHECK (status IN ('pending', 'completed', 'cancelled'));

-- Add missing RLS policies
DO $$ 
BEGIN
  -- Lessons policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lessons' AND policyname = 'Teachers can update lessons of their students'
  ) THEN
    CREATE POLICY "Teachers can update lessons of their students"
      ON lessons
      FOR UPDATE
      TO authenticated
      USING (student_id IN (
        SELECT id FROM students WHERE teacher_id IN (
          SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
        )
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lessons' AND policyname = 'Teachers can delete lessons of their students'
  ) THEN
    CREATE POLICY "Teachers can delete lessons of their students"
      ON lessons
      FOR DELETE
      TO authenticated
      USING (student_id IN (
        SELECT id FROM students WHERE teacher_id IN (
          SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
        )
      ));
  END IF;

  -- Payments policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Teachers can update payments of their students'
  ) THEN
    CREATE POLICY "Teachers can update payments of their students"
      ON payments
      FOR UPDATE
      TO authenticated
      USING (student_id IN (
        SELECT id FROM students WHERE teacher_id IN (
          SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
        )
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Teachers can delete payments of their students'
  ) THEN
    CREATE POLICY "Teachers can delete payments of their students"
      ON payments
      FOR DELETE
      TO authenticated
      USING (student_id IN (
        SELECT id FROM students WHERE teacher_id IN (
          SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
        )
      ));
  END IF;
END $$;