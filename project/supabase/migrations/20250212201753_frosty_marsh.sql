/*
  # Add status tracking to lessons table

  1. Changes
    - Add status column to track lesson completion (completed, postponed)
    - Add postponed_to column to store new date/time for postponed lessons
    - Add postpone_reason column to store reason for postponement
    - Add check constraint to validate status values
*/

-- Add new columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'status') THEN
    ALTER TABLE lessons ADD COLUMN status text CHECK (status IN ('completed', 'postponed'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'postponed_to') THEN
    ALTER TABLE lessons ADD COLUMN postponed_to timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'postpone_reason') THEN
    ALTER TABLE lessons ADD COLUMN postpone_reason text;
  END IF;
END $$;

-- Add constraint to ensure postponed_to and postpone_reason are set when status is 'postponed'
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS check_postponed_fields;
ALTER TABLE lessons ADD CONSTRAINT check_postponed_fields 
  CHECK (
    (status = 'postponed' AND postponed_to IS NOT NULL AND postpone_reason IS NOT NULL) OR
    (status != 'postponed')
  );