CREATE TABLE user_regions (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, region_id)
);

CREATE TABLE user_sectors (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sector_id UUID NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, sector_id)
);

CREATE INDEX idx_user_regions_region_id ON user_regions(region_id);
CREATE INDEX idx_user_sectors_sector_id ON user_sectors(sector_id);
