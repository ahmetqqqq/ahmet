/*
  # Add notifications system

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `teacher_id` (uuid, references teacher_profiles)
      - `title` (text)
      - `message` (text)
      - `type` (text: 'lesson', 'payment', 'student', 'system')
      - `read` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on notifications table
    - Add policies for authenticated users to manage their notifications
*/

-- Create notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES teacher_profiles(id) NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('lesson', 'payment', 'student', 'system')),
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Teachers can view their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (teacher_id IN (
    SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Teachers can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (teacher_id IN (
    SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
  ));

-- Create index for better performance
CREATE INDEX notifications_teacher_id_idx ON notifications(teacher_id);
CREATE INDEX notifications_read_idx ON notifications(read);
CREATE INDEX notifications_created_at_idx ON notifications(created_at);