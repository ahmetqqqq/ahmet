/*
  # Fix students and statistics tables

  1. Changes
    - Add missing indexes for students table
    - Add missing indexes for lessons table
    - Add missing indexes for payments table
  
  2. Security
    - Enable RLS on all tables
    - Add policies for data access
*/

-- Add missing indexes
CREATE INDEX IF NOT EXISTS students_teacher_id_idx ON students(teacher_id);
CREATE INDEX IF NOT EXISTS lessons_student_id_idx ON lessons(student_id);
CREATE INDEX IF NOT EXISTS payments_student_id_idx ON payments(student_id);

-- Ensure RLS is enabled
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Recreate policies if they don't exist
DO $$ 
BEGIN
  -- Students policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'students' AND policyname = 'Teachers can view their own students'
  ) THEN
    CREATE POLICY "Teachers can view their own students"
      ON students
      FOR SELECT
      TO authenticated
      USING (teacher_id IN (
        SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'students' AND policyname = 'Teachers can insert their own students'
  ) THEN
    CREATE POLICY "Teachers can insert their own students"
      ON students
      FOR INSERT
      TO authenticated
      WITH CHECK (teacher_id IN (
        SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'students' AND policyname = 'Teachers can update their own students'
  ) THEN
    CREATE POLICY "Teachers can update their own students"
      ON students
      FOR UPDATE
      TO authenticated
      USING (teacher_id IN (
        SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'students' AND policyname = 'Teachers can delete their own students'
  ) THEN
    CREATE POLICY "Teachers can delete their own students"
      ON students
      FOR DELETE
      TO authenticated
      USING (teacher_id IN (
        SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
      ));
  END IF;

  -- Lessons policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lessons' AND policyname = 'Teachers can view lessons of their students'
  ) THEN
    CREATE POLICY "Teachers can view lessons of their students"
      ON lessons
      FOR SELECT
      TO authenticated
      USING (student_id IN (
        SELECT id FROM students WHERE teacher_id IN (
          SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
        )
      ));
  END IF;

  -- Payments policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Teachers can view payments of their students'
  ) THEN
    CREATE POLICY "Teachers can view payments of their students"
      ON payments
      FOR SELECT
      TO authenticated
      USING (student_id IN (
        SELECT id FROM students WHERE teacher_id IN (
          SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
        )
      ));
  END IF;
END $$;