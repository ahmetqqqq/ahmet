-- Drop and recreate user_settings table with better defaults
DROP TABLE IF EXISTS user_settings CASCADE;

CREATE TABLE user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
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
  }'::jsonb,
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

-- Create index for faster lookups
CREATE INDEX user_settings_user_id_idx ON user_settings(user_id);

-- Create function to handle settings upsert
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create settings for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();