/*
  # Add Schedule Tables

  1. New Tables
    - `schedule`: Stores teacher's weekly schedule entries
      - `id` (uuid, primary key)
      - `teacher_id` (uuid, references teacher_profiles)
      - `student_id` (uuid, references students)
      - `day_of_week` (text)
      - `time_slot` (text)
      - `subject` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `teacher_time_slots`: Stores teacher's available time slots
      - `teacher_id` (uuid, primary key, references teacher_profiles)
      - `time_slots` (text array)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own schedules
*/

-- Create schedule table
CREATE TABLE schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES teacher_profiles(id) NOT NULL,
  student_id uuid REFERENCES students(id) NOT NULL,
  day_of_week text NOT NULL,
  time_slot text NOT NULL,
  subject text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create teacher_time_slots table
CREATE TABLE teacher_time_slots (
  teacher_id uuid PRIMARY KEY REFERENCES teacher_profiles(id),
  time_slots text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_time_slots ENABLE ROW LEVEL SECURITY;

-- Policies for schedule table
CREATE POLICY "Teachers can view their own schedule"
  ON schedule
  FOR SELECT
  TO authenticated
  USING (teacher_id IN (
    SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Teachers can insert into their own schedule"
  ON schedule
  FOR INSERT
  TO authenticated
  WITH CHECK (teacher_id IN (
    SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Teachers can update their own schedule"
  ON schedule
  FOR UPDATE
  TO authenticated
  USING (teacher_id IN (
    SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Teachers can delete from their own schedule"
  ON schedule
  FOR DELETE
  TO authenticated
  USING (teacher_id IN (
    SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
  ));

-- Policies for teacher_time_slots table
CREATE POLICY "Teachers can view their own time slots"
  ON teacher_time_slots
  FOR SELECT
  TO authenticated
  USING (teacher_id IN (
    SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Teachers can insert their own time slots"
  ON teacher_time_slots
  FOR INSERT
  TO authenticated
  WITH CHECK (teacher_id IN (
    SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Teachers can update their own time slots"
  ON teacher_time_slots
  FOR UPDATE
  TO authenticated
  USING (teacher_id IN (
    SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
  ));

-- Create indexes for better performance
CREATE INDEX schedule_teacher_id_idx ON schedule(teacher_id);
CREATE INDEX schedule_student_id_idx ON schedule(student_id);
CREATE INDEX schedule_day_time_idx ON schedule(day_of_week, time_slot);