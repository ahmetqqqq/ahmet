-- Drop and recreate notifications table with correct structure
DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES teacher_profiles(id) NOT NULL,
  student_id uuid REFERENCES students(id) NOT NULL,
  lesson_id uuid REFERENCES lessons(id) NOT NULL,
  type text NOT NULL CHECK (type IN ('1_day', '3_hours', '1_hour', '10_minutes')),
  read boolean DEFAULT false,
  sent boolean DEFAULT false,
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

-- Create indexes for better performance
CREATE INDEX notifications_teacher_id_idx ON notifications(teacher_id);
CREATE INDEX notifications_sent_idx ON notifications(sent);
CREATE INDEX notifications_read_idx ON notifications(read);
CREATE INDEX notifications_created_at_idx ON notifications(created_at);

-- Create function to generate notifications for a lesson
CREATE OR REPLACE FUNCTION create_lesson_notifications()
RETURNS TRIGGER AS $$
DECLARE
  teacher_id uuid;
BEGIN
  -- Get teacher_id from students table
  SELECT s.teacher_id INTO teacher_id
  FROM students s
  WHERE s.id = NEW.student_id;

  -- Create notifications for different time intervals
  INSERT INTO notifications (teacher_id, student_id, lesson_id, type)
  VALUES
    (teacher_id, NEW.student_id, NEW.id, '1_day'),
    (teacher_id, NEW.student_id, NEW.id, '3_hours'),
    (teacher_id, NEW.student_id, NEW.id, '1_hour'),
    (teacher_id, NEW.student_id, NEW.id, '10_minutes');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new lessons
DROP TRIGGER IF EXISTS on_lesson_created ON lessons;
CREATE TRIGGER on_lesson_created
  AFTER INSERT ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION create_lesson_notifications();

-- Create function to check and mark notifications as sent
CREATE OR REPLACE FUNCTION check_lesson_notifications()
RETURNS void AS $$
DECLARE
  notification_record RECORD;
BEGIN
  FOR notification_record IN
    SELECT 
      n.id,
      n.type,
      l.start_time,
      l.day_of_week,
      s.full_name as student_name,
      l.subject
    FROM notifications n
    JOIN lessons l ON n.lesson_id = l.id
    JOIN students s ON n.student_id = s.id
    WHERE NOT n.sent
  LOOP
    -- Calculate notification time based on type
    CASE notification_record.type
      WHEN '1_day' THEN
        -- Check if lesson is tomorrow
        IF notification_record.start_time - INTERVAL '1 day' <= NOW() THEN
          -- Mark as sent
          UPDATE notifications SET sent = true WHERE id = notification_record.id;
        END IF;
      WHEN '3_hours' THEN
        -- Check if lesson is in 3 hours
        IF notification_record.start_time - INTERVAL '3 hours' <= NOW() THEN
          UPDATE notifications SET sent = true WHERE id = notification_record.id;
        END IF;
      WHEN '1_hour' THEN
        -- Check if lesson is in 1 hour
        IF notification_record.start_time - INTERVAL '1 hour' <= NOW() THEN
          UPDATE notifications SET sent = true WHERE id = notification_record.id;
        END IF;
      WHEN '10_minutes' THEN
        -- Check if lesson is in 10 minutes
        IF notification_record.start_time - INTERVAL '10 minutes' <= NOW() THEN
          UPDATE notifications SET sent = true WHERE id = notification_record.id;
        END IF;
    END CASE;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;