DELETE FROM public_holidays
WHERE country_office_id IN (SELECT id FROM country_offices WHERE code IN ('SO', 'KE', 'ET', 'DJ'));

DELETE FROM regions
WHERE country_office_id IN (SELECT id FROM country_offices WHERE code IN ('SO', 'KE', 'ET', 'DJ'));

DELETE FROM sectors
WHERE name IN (
  'Telecommunications', 'Financial Services', 'Healthcare', 'Government',
  'Education', 'Retail', 'Logistics', 'Energy', 'Hospitality',
  'Manufacturing', 'NGO', 'Agriculture'
);

DELETE FROM country_offices WHERE code IN ('SO', 'KE', 'ET', 'DJ');
