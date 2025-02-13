/*
  # Create students and lessons tables

  1. New Tables
    - `students`
      - `id` (uuid, primary key)
      - `teacher_id` (uuid, references teacher_profiles)
      - `full_name` (text)
      - `grade` (text)
      - `phone` (text)
      - `parent_name` (text)
      - `parent_phone` (text)
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `lessons`
      - `id` (uuid, primary key)
      - `student_id` (uuid, references students)
      - `subject` (text)
      - `day_of_week` (text)
      - `start_time` (time)
      - `duration` (interval)
      - `price_per_hour` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for teachers to manage their own students and lessons
*/

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES teacher_profiles(id) NOT NULL,
  full_name text NOT NULL,
  grade text,
  phone text,
  parent_name text,
  parent_phone text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) NOT NULL,
  subject text NOT NULL,
  day_of_week text NOT NULL,
  start_time time NOT NULL,
  duration interval NOT NULL DEFAULT '1 hour',
  price_per_hour numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Create policies for students table
CREATE POLICY "Teachers can view their own students"
  ON students
  FOR SELECT
  TO authenticated
  USING (teacher_id IN (
    SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Teachers can insert their own students"
  ON students
  FOR INSERT
  TO authenticated
  WITH CHECK (teacher_id IN (
    SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Teachers can update their own students"
  ON students
  FOR UPDATE
  TO authenticated
  USING (teacher_id IN (
    SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
  ));

-- Create policies for lessons table
CREATE POLICY "Teachers can view lessons of their students"
  ON lessons
  FOR SELECT
  TO authenticated
  USING (student_id IN (
    SELECT id FROM students WHERE teacher_id IN (
      SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Teachers can insert lessons for their students"
  ON lessons
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id IN (
    SELECT id FROM students WHERE teacher_id IN (
      SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Teachers can update lessons of their students"
  ON lessons
  FOR UPDATE
  TO authenticated
  USING (student_id IN (
    SELECT id FROM students WHERE teacher_id IN (
      SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
    )
  ));