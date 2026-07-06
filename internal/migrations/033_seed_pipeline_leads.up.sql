DO $$
DECLARE
  am_id UUID;
BEGIN
  SELECT id INTO am_id
  FROM users
  WHERE role = 'ACCOUNT_MANAGER'
  ORDER BY created_at, email
  LIMIT 1;

  IF am_id IS NULL THEN
    RAISE NOTICE 'Skipping pipeline lead seed: no ACCOUNT_MANAGER user exists';
    RETURN;
  END IF;

  INSERT INTO leads (
    company_name,
    country_id,
    sector_id,
    owner_id,
    stage,
    stage_number,
    value_usd,
    probability,
    expected_close_date,
    status,
    source,
    notes,
    won_date,
    created_at,
    updated_at
  )
  SELECT
    seed.company_name,
    co.id,
    s.id,
    am_id,
    seed.stage::lead_stage,
    seed.stage_number,
    seed.value_usd,
    seed.probability,
    seed.expected_close_date::date,
    seed.status::lead_status,
    'seed',
    seed.notes,
    seed.won_date::date,
    seed.created_at::timestamptz,
    seed.updated_at::timestamptz
  FROM (VALUES
    ('SomBank Core Banking Modernization', 'SO', 'Financial Services', 'NEGOTIATION', 7, 420000.00, 0.70, '2026-08-18', 'OPEN', NULL, 'Core banking DR and secure hosting expansion.', NOW() - INTERVAL '68 days', NOW() - INTERVAL '2 days'),
    ('Hormuud Telecom Cloud Backup', 'SO', 'Telecommunications', 'PROPOSAL', 5, 310000.00, 0.55, '2026-09-05', 'OPEN', NULL, 'Backup and monitoring for customer-facing platforms.', NOW() - INTERVAL '52 days', NOW() - INTERVAL '4 days'),
    ('Dahabshiil Payments DR', 'SO', 'Financial Services', 'WON', 9, 260000.00, 1.00, '2026-07-22', 'CLOSED', CURRENT_DATE - INTERVAL '5 days', 'Won DR subscription for payments workloads.', NOW() - INTERVAL '75 days', NOW() - INTERVAL '5 days'),
    ('Kenya Airways Data Platform', 'KE', 'Logistics', 'QUALIFIED', 3, 360000.00, 0.35, '2026-10-10', 'OPEN', NULL, 'Analytics platform discovery for route and cargo data.', NOW() - INTERVAL '29 days', NOW() - INTERVAL '1 day'),
    ('Co-op Bank Security Package', 'KE', 'Financial Services', 'NEGOTIATION', 6, 540000.00, 0.65, '2026-08-30', 'OPEN', NULL, 'Security and compliance package for regulated workloads.', NOW() - INTERVAL '61 days', NOW() - INTERVAL '3 days'),
    ('Nairobi County Digital Services', 'KE', 'Government', 'PROPOSAL', 4, 280000.00, 0.45, '2026-09-25', 'OPEN', NULL, 'Citizen service hosting and backup proposal.', NOW() - INTERVAL '44 days', NOW() - INTERVAL '6 days'),
    ('Ethiopian Airlines Kubernetes Platform', 'ET', 'Logistics', 'NEGOTIATION', 8, 610000.00, 0.78, '2026-08-12', 'OPEN', NULL, 'Managed Kubernetes and monitoring for digital channels.', NOW() - INTERVAL '83 days', NOW() - INTERVAL '1 day'),
    ('Awash Bank Managed Database', 'ET', 'Financial Services', 'QUALIFIED', 2, 330000.00, 0.30, '2026-10-20', 'OPEN', NULL, 'Managed database assessment for customer systems.', NOW() - INTERVAL '18 days', NOW() - INTERVAL '5 days'),
    ('Djibouti Telecom OBS Expansion', 'DJ', 'Telecommunications', 'WON', 9, 190000.00, 1.00, '2026-07-20', 'CLOSED', CURRENT_DATE - INTERVAL '3 days', 'Won object storage expansion for network logs.', NOW() - INTERVAL '57 days', NOW() - INTERVAL '3 days'),
    ('Port de Djibouti DR Readiness', 'DJ', 'Logistics', 'PROPOSAL', 5, 240000.00, 0.50, '2026-09-14', 'OPEN', NULL, 'DR readiness and backup planning for port operations.', NOW() - INTERVAL '37 days', NOW() - INTERVAL '2 days')
  ) AS seed(company_name, country_code, sector_name, stage, stage_number, value_usd, probability, expected_close_date, status, won_date, notes, created_at, updated_at)
  JOIN country_offices co ON co.code = seed.country_code
  JOIN sectors s ON s.name = seed.sector_name
  WHERE NOT EXISTS (
    SELECT 1
    FROM leads existing
    WHERE existing.company_name = seed.company_name
  );
END $$;
