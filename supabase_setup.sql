-- Run this in your Supabase SQL Editor (one time setup)
-- Dashboard → SQL Editor → New query → paste this → Run

CREATE TABLE IF NOT EXISTS bracket_entries (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  g_picks       JSONB DEFAULT '{}',
  third_picks   JSONB DEFAULT '[]',
  winners       JSONB DEFAULT '{}',
  score         INTEGER DEFAULT 0,
  correct_picks INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Allow anyone to read all entries (public leaderboard)
ALTER TABLE bracket_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read entries"
  ON bracket_entries FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert their bracket"
  ON bracket_entries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update their bracket by email"
  ON bracket_entries FOR UPDATE
  USING (true);

-- Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bracket_entries_updated_at
  BEFORE UPDATE ON bracket_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
