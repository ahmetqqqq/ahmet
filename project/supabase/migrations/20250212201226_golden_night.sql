/*
  # Add lesson status tracking

  1. Changes
    - Add status column to lessons table
    - Add postponed_to column to lessons table
    - Add postpone_reason column to lessons table

  2. Purpose
    - Enable tracking lesson completion status
    - Allow postponing lessons with new date/time
    - Store reason for postponement
*/

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS postponed_to timestamptz;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS postpone_reason text;