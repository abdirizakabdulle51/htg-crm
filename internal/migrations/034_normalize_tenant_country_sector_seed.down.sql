WITH desired(name, country_code, sector_name) AS (
  VALUES
    ('Somalia Tenant 05', 'SO', 'Education'),
    ('Kenya Tenant 06', 'KE', 'Energy'),
    ('Ethiopia Tenant 04', 'ET', 'Energy')
)
UPDATE tenants t
SET country_id = co.id,
    sector_id = s.id,
    updated_at = NOW()
FROM desired d
JOIN country_offices co ON co.code = d.country_code
JOIN sectors s ON s.name = d.sector_name
WHERE t.name = d.name;

UPDATE sectors
SET name = 'Telecommunications', description = 'Network and connectivity providers'
WHERE name = 'Telecom';

UPDATE sectors
SET name = 'Financial Services', description = 'Banks, fintech, insurance, and payments'
WHERE name = 'Finance';
