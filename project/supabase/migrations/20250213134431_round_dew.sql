-- Add ON DELETE CASCADE to notifications table
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_lesson_id_fkey,
ADD CONSTRAINT notifications_lesson_id_fkey
  FOREIGN KEY (lesson_id)
  REFERENCES lessons(id)
  ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS notifications_lesson_id_idx ON notifications(lesson_id);