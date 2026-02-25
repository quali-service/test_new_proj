-- ============================================================
-- STEP 1: Enable vector extension
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- STEP 2: Recreate embedding column as vector(1536)
-- (OpenAI text-embedding-3-small outputs 1536 dimensions)
-- ============================================================
ALTER TABLE ressources DROP COLUMN IF EXISTS embedding;
ALTER TABLE ressources ADD COLUMN embedding vector(1536);

-- ============================================================
-- STEP 3: Similarity search function
-- ============================================================
DROP FUNCTION IF EXISTS match_ressources;

CREATE OR REPLACE FUNCTION match_ressources(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.4,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id bigint,
    title text,
    type text,
    learning text,
    source_url text,
    author_id int,
    similarity float
)
LANGUAGE sql STABLE
AS $$
    SELECT
        r.id,
        r.title,
        r.type,
        r.learning,
        r.source_url,
        r.author_id,
        1 - (r.embedding <=> query_embedding) AS similarity
    FROM ressources r
    WHERE
        r.embedding IS NOT NULL
        AND 1 - (r.embedding <=> query_embedding) > match_threshold
    ORDER BY r.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- ============================================================
-- STEP 4: Index (run only after backfill is complete)
-- ============================================================
-- CREATE INDEX IF NOT EXISTS ressources_embedding_idx
-- ON ressources
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);
