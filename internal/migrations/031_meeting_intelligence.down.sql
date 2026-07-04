ALTER TABLE activities
  DROP COLUMN IF EXISTS next_action_notes,
  DROP COLUMN IF EXISTS ai_summary,
  DROP COLUMN IF EXISTS ai_output;
