INSERT INTO country_offices (code, name, timezone, currency_code) VALUES
  ('SO', 'Somalia', 'Africa/Mogadishu', 'USD'),
  ('KE', 'Kenya', 'Africa/Nairobi', 'KES'),
  ('ET', 'Ethiopia', 'Africa/Addis_Ababa', 'ETB'),
  ('DJ', 'Djibouti', 'Africa/Djibouti', 'DJF')
ON CONFLICT (code) DO NOTHING;

INSERT INTO sectors (name, description) VALUES
  ('Telecommunications', 'Network and connectivity providers'),
  ('Financial Services', 'Banks, fintech, insurance, and payments'),
  ('Healthcare', 'Hospitals, clinics, and health technology'),
  ('Government', 'Public sector institutions'),
  ('Education', 'Schools, universities, and training providers'),
  ('Retail', 'Retail and commerce organizations'),
  ('Logistics', 'Transport, warehousing, and supply chain'),
  ('Energy', 'Power, utilities, and energy providers'),
  ('Hospitality', 'Hotels, tourism, and travel'),
  ('Manufacturing', 'Industrial and production firms'),
  ('NGO', 'Non-governmental organizations'),
  ('Agriculture', 'Agribusiness and food production')
ON CONFLICT (name) DO NOTHING;

INSERT INTO regions (country_office_id, name, code)
SELECT co.id, r.name, r.code
FROM country_offices co
JOIN (VALUES
  ('SO', 'Mogadishu', 'BN'),
  ('SO', 'Hargeisa', 'HG'),
  ('KE', 'Nairobi', 'NRB'),
  ('KE', 'Mombasa', 'MBA'),
  ('KE', 'Kisumu', 'KSM'),
  ('ET', 'Addis Ababa', 'AA'),
  ('ET', 'Dire Dawa', 'DD'),
  ('DJ', 'Djibouti City', 'DJI'),
  ('DJ', 'Ali Sabieh', 'AS')
) AS r(country_code, name, code) ON r.country_code = co.code
ON CONFLICT (country_office_id, code) DO NOTHING;

INSERT INTO public_holidays (country_office_id, holiday_date, name, year)
SELECT co.id, h.holiday_date::date, h.name, EXTRACT(YEAR FROM h.holiday_date::date)::int
FROM country_offices co
JOIN (VALUES
  ('SO', '2025-01-01', 'New Year''s Day'), ('SO', '2025-05-01', 'Labour Day'), ('SO', '2025-07-01', 'Independence Day'),
  ('SO', '2026-01-01', 'New Year''s Day'), ('SO', '2026-05-01', 'Labour Day'), ('SO', '2026-07-01', 'Independence Day'),
  ('KE', '2025-01-01', 'New Year''s Day'), ('KE', '2025-06-01', 'Madaraka Day'), ('KE', '2025-12-12', 'Jamhuri Day'),
  ('KE', '2026-01-01', 'New Year''s Day'), ('KE', '2026-06-01', 'Madaraka Day'), ('KE', '2026-12-12', 'Jamhuri Day'),
  ('ET', '2025-01-07', 'Ethiopian Christmas'), ('ET', '2025-09-11', 'Ethiopian New Year'), ('ET', '2025-09-27', 'Meskel'),
  ('ET', '2026-01-07', 'Ethiopian Christmas'), ('ET', '2026-09-11', 'Ethiopian New Year'), ('ET', '2026-09-27', 'Meskel'),
  ('DJ', '2025-01-01', 'New Year''s Day'), ('DJ', '2025-06-27', 'Independence Day'), ('DJ', '2025-05-01', 'Labour Day'),
  ('DJ', '2026-01-01', 'New Year''s Day'), ('DJ', '2026-06-27', 'Independence Day'), ('DJ', '2026-05-01', 'Labour Day')
) AS h(country_code, holiday_date, name) ON h.country_code = co.code
ON CONFLICT (country_office_id, holiday_date) DO NOTHING;
