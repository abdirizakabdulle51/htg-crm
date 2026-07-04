ALTER TABLE tenant_embeddings
  ADD COLUMN IF NOT EXISTS chunk_text TEXT,
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

UPDATE tenant_embeddings
SET chunk_text = COALESCE(chunk_text, content),
    content_hash = COALESCE(content_hash, encode(sha256(COALESCE(content, '')::bytea), 'hex'));

ALTER TABLE tenant_embeddings
  ALTER COLUMN chunk_text SET NOT NULL,
  ALTER COLUMN content_hash SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_embeddings_content_hash ON tenant_embeddings(content_hash);
