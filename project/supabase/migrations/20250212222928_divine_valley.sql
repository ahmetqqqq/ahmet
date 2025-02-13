/*
  # Ödemeler sistemi için veritabanı şeması

  1. Yeni Tablolar
    - `payments`
      - `id` (uuid, primary key)
      - `student_id` (uuid, foreign key)
      - `amount` (numeric)
      - `payment_date` (timestamptz)
      - `payment_method` (text)
      - `description` (text)
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `payments` table
    - Add policies for authenticated users
*/

-- Ödemeler tablosu
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) NOT NULL,
  amount numeric(10,2) NOT NULL,
  payment_date timestamptz NOT NULL DEFAULT now(),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'credit_card', 'bank_transfer', 'other')),
  description text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payments
CREATE POLICY "Teachers can view payments of their students"
  ON payments
  FOR SELECT
  TO authenticated
  USING (student_id IN (
    SELECT id FROM students WHERE teacher_id IN (
      SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Teachers can insert payments for their students"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id IN (
    SELECT id FROM students WHERE teacher_id IN (
      SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Teachers can update payments of their students"
  ON payments
  FOR UPDATE
  TO authenticated
  USING (student_id IN (
    SELECT id FROM students WHERE teacher_id IN (
      SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Teachers can delete payments of their students"
  ON payments
  FOR DELETE
  TO authenticated
  USING (student_id IN (
    SELECT id FROM students WHERE teacher_id IN (
      SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
    )
  ));

-- Create index for faster queries
CREATE INDEX payments_student_id_idx ON payments(student_id);
CREATE INDEX payments_payment_date_idx ON payments(payment_date);