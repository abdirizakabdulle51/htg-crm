BEGIN;

-- Remove mock placeholder tenants (all "<Country> Tenant 0N")
DELETE FROM tenants WHERE name ~ '^(Kenya|Ethiopia|Djibouti|Somalia) Tenant [0-9]';
-- Remove any prior copy of the real tenants (idempotent re-run)
DELETE FROM tenants WHERE name IN
 ('Daalo','Anti Froud','HS Credit Score','SSB','Taaj','Easy','NSES','Prime',
  'SAB WAAFI','SomGas','Buruuj','SQMA','Nasiye','Mizan','DSS');
-- Remove all leads (current leads are all mock/seed); real ones re-inserted below
DELETE FROM leads;

-- Real active customers -> tenants (health/risk are numeric(5,4), 0..1 scale)
INSERT INTO tenants (country_id, sector_id, account_manager_id, name, status, arr_usd, mrr_usd, health_score, risk_score, renewal_date, created_by) VALUES
('029d3da0-19a7-4bd1-8dbb-a915bef8055e','fcb59619-1066-4857-8280-2dead6856281','7dd609d7-4e72-447f-8ef7-a976ea1a15cb','Daalo','ACTIVE',3780,315,0.85,0.15,'2027-01-01','7dd609d7-4e72-447f-8ef7-a976ea1a15cb'),
('029d3da0-19a7-4bd1-8dbb-a915bef8055e','d3ef1714-976e-4048-b0fc-958d84995c9f','7dd609d7-4e72-447f-8ef7-a976ea1a15cb','Anti Froud','ACTIVE',14112,1176,0.85,0.15,'2027-01-01','7dd609d7-4e72-447f-8ef7-a976ea1a15cb'),
('029d3da0-19a7-4bd1-8dbb-a915bef8055e','d3ef1714-976e-4048-b0fc-958d84995c9f','7dd609d7-4e72-447f-8ef7-a976ea1a15cb','HS Credit Score','ACTIVE',44016,3668,0.45,0.65,'2027-01-01','7dd609d7-4e72-447f-8ef7-a976ea1a15cb'),
('029d3da0-19a7-4bd1-8dbb-a915bef8055e','59221f4e-b1bb-4044-b844-659bea171825','7dd609d7-4e72-447f-8ef7-a976ea1a15cb','SSB','ACTIVE',99996,8333,0.85,0.15,'2027-01-01','7dd609d7-4e72-447f-8ef7-a976ea1a15cb'),
('029d3da0-19a7-4bd1-8dbb-a915bef8055e','59221f4e-b1bb-4044-b844-659bea171825','7dd609d7-4e72-447f-8ef7-a976ea1a15cb','Taaj','ACTIVE',49203,4100,0.85,0.15,'2026-12-31','7dd609d7-4e72-447f-8ef7-a976ea1a15cb'),
('029d3da0-19a7-4bd1-8dbb-a915bef8055e','d3ef1714-976e-4048-b0fc-958d84995c9f','7dd609d7-4e72-447f-8ef7-a976ea1a15cb','Easy','ACTIVE',70499,5875,0.85,0.15,'2026-12-31','7dd609d7-4e72-447f-8ef7-a976ea1a15cb'),
('029d3da0-19a7-4bd1-8dbb-a915bef8055e','a507bfe5-bfc0-496f-9443-e27603fc77a2','7dd609d7-4e72-447f-8ef7-a976ea1a15cb','NSES','ACTIVE',5759,480,0.85,0.15,'2026-12-31','7dd609d7-4e72-447f-8ef7-a976ea1a15cb'),
('029d3da0-19a7-4bd1-8dbb-a915bef8055e','d3ef1714-976e-4048-b0fc-958d84995c9f','7dd609d7-4e72-447f-8ef7-a976ea1a15cb','Prime','ACTIVE',27600,2300,0.70,0.35,'2026-12-31','7dd609d7-4e72-447f-8ef7-a976ea1a15cb'),
('25d20433-056d-413b-9a3c-362a730f3c0a','59221f4e-b1bb-4044-b844-659bea171825','7dd609d7-4e72-447f-8ef7-a976ea1a15cb','SAB WAAFI','ACTIVE',142496,11875,0.85,0.15,'2026-12-31','7dd609d7-4e72-447f-8ef7-a976ea1a15cb'),
('029d3da0-19a7-4bd1-8dbb-a915bef8055e','df989d27-11eb-4d87-80e3-74b9e8ebfdea','7dd609d7-4e72-447f-8ef7-a976ea1a15cb','SomGas','ACTIVE',583,49,0.85,0.15,'2026-12-31','7dd609d7-4e72-447f-8ef7-a976ea1a15cb'),
('029d3da0-19a7-4bd1-8dbb-a915bef8055e','dca6440f-ee55-473a-a91e-9b00794277ac','7dd609d7-4e72-447f-8ef7-a976ea1a15cb','Buruuj','ACTIVE',6720,560,0.85,0.15,'2026-12-31','7dd609d7-4e72-447f-8ef7-a976ea1a15cb'),
('029d3da0-19a7-4bd1-8dbb-a915bef8055e','a507bfe5-bfc0-496f-9443-e27603fc77a2','7dd609d7-4e72-447f-8ef7-a976ea1a15cb','SQMA','ACTIVE',696,58,0.85,0.15,NULL,'7dd609d7-4e72-447f-8ef7-a976ea1a15cb'),
('029d3da0-19a7-4bd1-8dbb-a915bef8055e','d3ef1714-976e-4048-b0fc-958d84995c9f','7dd609d7-4e72-447f-8ef7-a976ea1a15cb','Nasiye','ACTIVE',3048,254,0.45,0.65,NULL,'7dd609d7-4e72-447f-8ef7-a976ea1a15cb'),
('029d3da0-19a7-4bd1-8dbb-a915bef8055e','dca6440f-ee55-473a-a91e-9b00794277ac','7dd609d7-4e72-447f-8ef7-a976ea1a15cb','Mizan','ACTIVE',2400,200,0.85,0.15,NULL,'7dd609d7-4e72-447f-8ef7-a976ea1a15cb'),
('029d3da0-19a7-4bd1-8dbb-a915bef8055e','a507bfe5-bfc0-496f-9443-e27603fc77a2','7dd609d7-4e72-447f-8ef7-a976ea1a15cb','DSS','ACTIVE',86172,7181,0.45,0.65,'2027-01-01','7dd609d7-4e72-447f-8ef7-a976ea1a15cb');

-- Real pipeline -> open leads (Negotiation, stage_number 6, probability 0.60)
INSERT INTO leads (owner_id, country_id, sector_id, company_name, stage, stage_number, status, value_usd, probability, expected_close_date, source) VALUES
('7dd609d7-4e72-447f-8ef7-a976ea1a15cb','029d3da0-19a7-4bd1-8dbb-a915bef8055e','59221f4e-b1bb-4044-b844-659bea171825','Bulsho Bank','NEGOTIATION',6,'OPEN',0,0.60,'2026-09-01','Somalia sheet'),
('7dd609d7-4e72-447f-8ef7-a976ea1a15cb','029d3da0-19a7-4bd1-8dbb-a915bef8055e','59221f4e-b1bb-4044-b844-659bea171825','Agro Bank','NEGOTIATION',6,'OPEN',0,0.60,'2026-09-01','Somalia sheet'),
('7dd609d7-4e72-447f-8ef7-a976ea1a15cb','029d3da0-19a7-4bd1-8dbb-a915bef8055e','59221f4e-b1bb-4044-b844-659bea171825','Galaxy Bank','NEGOTIATION',6,'OPEN',0,0.60,'2026-08-01','Somalia sheet'),
('7dd609d7-4e72-447f-8ef7-a976ea1a15cb','029d3da0-19a7-4bd1-8dbb-a915bef8055e','a507bfe5-bfc0-496f-9443-e27603fc77a2','Immigration Authority','NEGOTIATION',6,'OPEN',0,0.60,'2026-09-01','Somalia sheet'),
('7dd609d7-4e72-447f-8ef7-a976ea1a15cb','029d3da0-19a7-4bd1-8dbb-a915bef8055e','59221f4e-b1bb-4044-b844-659bea171825','Idman Bank','NEGOTIATION',6,'OPEN',0,0.60,'2026-09-01','Somalia sheet'),
('7dd609d7-4e72-447f-8ef7-a976ea1a15cb','029d3da0-19a7-4bd1-8dbb-a915bef8055e','59221f4e-b1bb-4044-b844-659bea171825','Amal Bank','NEGOTIATION',6,'OPEN',0,0.60,NULL,'Somalia sheet'),
('7dd609d7-4e72-447f-8ef7-a976ea1a15cb','029d3da0-19a7-4bd1-8dbb-a915bef8055e','59221f4e-b1bb-4044-b844-659bea171825','SomBank','NEGOTIATION',6,'OPEN',0,0.60,NULL,'Somalia sheet'),
('7dd609d7-4e72-447f-8ef7-a976ea1a15cb','029d3da0-19a7-4bd1-8dbb-a915bef8055e','59221f4e-b1bb-4044-b844-659bea171825','Waafi Kenya','NEGOTIATION',6,'OPEN',2432,0.60,'2026-09-01','Somalia sheet'),
('7dd609d7-4e72-447f-8ef7-a976ea1a15cb','029d3da0-19a7-4bd1-8dbb-a915bef8055e','a507bfe5-bfc0-496f-9443-e27603fc77a2','DSS Expansion','NEGOTIATION',6,'OPEN',7181,0.60,'2026-08-01','Somalia sheet'),
('7dd609d7-4e72-447f-8ef7-a976ea1a15cb','029d3da0-19a7-4bd1-8dbb-a915bef8055e','d3ef1714-976e-4048-b0fc-958d84995c9f','Somnet','NEGOTIATION',6,'OPEN',3931,0.60,'2026-09-01','Somalia sheet'),
('7dd609d7-4e72-447f-8ef7-a976ea1a15cb','029d3da0-19a7-4bd1-8dbb-a915bef8055e','d3ef1714-976e-4048-b0fc-958d84995c9f','Daadihiye IVR','NEGOTIATION',6,'OPEN',0,0.60,NULL,'Somalia sheet'),
('7dd609d7-4e72-447f-8ef7-a976ea1a15cb','029d3da0-19a7-4bd1-8dbb-a915bef8055e','a507bfe5-bfc0-496f-9443-e27603fc77a2','Yameni Office','NEGOTIATION',6,'OPEN',0,0.60,'2026-12-01','Somalia sheet');

COMMIT;
