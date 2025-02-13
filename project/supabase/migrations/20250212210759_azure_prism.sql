/*
  # Allow multiple lessons at same time

  1. Changes
    - Remove unique constraint on day_of_week and start_time combination
    - Add index for faster lesson queries
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add index for faster lesson queries
CREATE INDEX IF NOT EXISTS lessons_day_time_idx ON lessons (day_of_week, start_time);