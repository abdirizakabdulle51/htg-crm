CREATE TABLE sales_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INT NOT NULL,
  annual_target_usd NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, year)
);

CREATE TRIGGER trg_sales_targets_updated_at
BEFORE UPDATE ON sales_targets
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE quarterly_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_target_id UUID NOT NULL REFERENCES sales_targets(id) ON DELETE CASCADE,
  quarter INT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  target_usd NUMERIC(14,2) NOT NULL,
  achieved_usd NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sales_target_id, quarter)
);

CREATE TRIGGER trg_quarterly_targets_updated_at
BEFORE UPDATE ON quarterly_targets
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
