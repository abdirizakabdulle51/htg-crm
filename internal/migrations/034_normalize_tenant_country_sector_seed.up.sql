UPDATE sectors
SET name = 'Telecom', description = 'Network and connectivity providers'
WHERE name = 'Telecommunications';

UPDATE sectors
SET name = 'Finance', description = 'Banks, fintech, insurance, and payments'
WHERE name = 'Financial Services';

WITH desired(name, country_code, sector_name) AS (
  VALUES
    ('Somalia Tenant 01', 'SO', 'Telecom'),
    ('Somalia Tenant 02', 'SO', 'Finance'),
    ('Somalia Tenant 03', 'SO', 'Government'),
    ('Somalia Tenant 04', 'SO', 'Healthcare'),
    ('Somalia Tenant 05', 'SO', 'Logistics'),
    ('Kenya Tenant 01', 'KE', 'Telecom'),
    ('Kenya Tenant 02', 'KE', 'Finance'),
    ('Kenya Tenant 03', 'KE', 'Government'),
    ('Kenya Tenant 04', 'KE', 'Healthcare'),
    ('Kenya Tenant 05', 'KE', 'Logistics'),
    ('Kenya Tenant 06', 'KE', 'Telecom'),
    ('Ethiopia Tenant 01', 'ET', 'Telecom'),
    ('Ethiopia Tenant 02', 'ET', 'Finance'),
    ('Ethiopia Tenant 03', 'ET', 'Logistics'),
    ('Ethiopia Tenant 04', 'ET', 'Healthcare'),
    ('Ethiopia Tenant 05', 'ET', 'Government'),
    ('Djibouti Tenant 01', 'DJ', 'Telecom'),
    ('Djibouti Tenant 02', 'DJ', 'Logistics'),
    ('Djibouti Tenant 03', 'DJ', 'Government'),
    ('Djibouti Tenant 04', 'DJ', 'Finance')
)
UPDATE tenants t
SET country_id = co.id,
    sector_id = s.id,
    updated_at = NOW()
FROM desired d
JOIN country_offices co ON co.code = d.country_code
JOIN sectors s ON s.name = d.sector_name
WHERE t.name = d.name;
