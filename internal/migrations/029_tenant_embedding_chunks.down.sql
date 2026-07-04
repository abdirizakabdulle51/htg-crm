DROP INDEX IF EXISTS idx_tenant_embeddings_content_hash;

ALTER TABLE tenant_embeddings
  DROP COLUMN IF EXISTS content_hash,
  DROP COLUMN IF EXISTS chunk_text;
