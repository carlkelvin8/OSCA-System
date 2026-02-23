-- ============================================================
-- PostgreSQL initialization script
-- Runs once when the PostgreSQL container is first created.
-- ============================================================

-- Enable pgvector extension (required for face embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- IVFFlat index on face_embeddings will be created via Alembic after table creation.
-- See: CREATE INDEX CONCURRENTLY ON face_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
