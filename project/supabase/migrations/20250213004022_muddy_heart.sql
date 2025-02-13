/*
  # Add User Settings Table

  1. New Tables
    - `user_settings`
      - `user_id` (uuid, primary key, references auth.users)
      - `settings` (jsonb, stores all user settings)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users to manage their own settings
*/

-- Create user_settings table
CREATE TABLE user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users,
  settings jsonb NOT NULL DEFAULT '{
    "theme": {
      "mode": "light",
      "primaryColor": "indigo",
      "menuStyle": "floating"
    },
    "notifications": {
      "enabled": true,
      "sound": true,
      "desktop": true,
      "email": false,
      "types": {
        "lessons": true,
        "payments": true,
        "students": true,
        "system": true
      }
    },
    "language": "tr",
    "timeFormat": "24h",
    "dataExport": {
      "format": "json",
      "includeStudents": true,
      "includeLessons": true,
      "includePayments": true
    }
  }',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own settings"
  ON user_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON user_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();