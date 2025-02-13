-- Drop existing foreign key constraint
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_lesson_id_fkey;

-- Add new foreign key constraint with CASCADE
ALTER TABLE notifications
ADD CONSTRAINT notifications_lesson_id_fkey
  FOREIGN KEY (lesson_id)
  REFERENCES lessons(id)
  ON DELETE CASCADE;

-- Add missing indexes if they don't exist
CREATE INDEX IF NOT EXISTS notifications_lesson_id_idx ON notifications(lesson_id);
CREATE INDEX IF NOT EXISTS notifications_student_id_idx ON notifications(student_id);
CREATE INDEX IF NOT EXISTS notifications_teacher_id_idx ON notifications(teacher_id);

-- Add cascade delete for student_id foreign key
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_student_id_fkey,
ADD CONSTRAINT notifications_student_id_fkey
  FOREIGN KEY (student_id)
  REFERENCES students(id)
  ON DELETE CASCADE;

-- Add cascade delete for teacher_id foreign key
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_teacher_id_fkey,
ADD CONSTRAINT notifications_teacher_id_fkey
  FOREIGN KEY (teacher_id)
  REFERENCES teacher_profiles(id)
  ON DELETE CASCADE;