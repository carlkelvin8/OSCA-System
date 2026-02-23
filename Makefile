# ============================================================
# OSCA System - Makefile
# Usage: make <target>
# ============================================================

.PHONY: help up down logs migrate test lint fmt shell-api shell-db

help:
	@echo ""
	@echo "OSCA System Commands"
	@echo "────────────────────────────────────────"
	@echo "  make up           Start all services (dev)"
	@echo "  make down         Stop all services"
	@echo "  make logs         Tail all logs"
	@echo "  make logs-api     Tail FastAPI logs"
	@echo "  make migrate      Run Alembic migrations"
	@echo "  make migrate-new  Create new migration (msg=<name>)"
	@echo "  make seed         Seed initial admin user"
	@echo "  make test         Run pytest suite"
	@echo "  make test-cov     Run pytest with coverage"
	@echo "  make lint         Run ruff linter"
	@echo "  make fmt          Auto-format with ruff + black"
	@echo "  make shell-api    Open shell in FastAPI container"
	@echo "  make shell-db     Open psql in PostgreSQL container"
	@echo "  make build        Rebuild all Docker images"
	@echo ""

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

logs-api:
	docker compose logs -f api

build:
	docker compose build --no-cache

migrate:
	docker compose exec api alembic upgrade head

migrate-new:
	docker compose exec api alembic revision --autogenerate -m "$(msg)"

migrate-down:
	docker compose exec api alembic downgrade -1

seed:
	docker compose exec api python -m app.scripts.seed

test:
	docker compose exec api pytest tests/ -v

test-cov:
	docker compose exec api pytest tests/ -v --cov=app --cov-report=term-missing --cov-report=html

lint:
	docker compose exec api ruff check app/ tests/

fmt:
	docker compose exec api ruff format app/ tests/

shell-api:
	docker compose exec api /bin/bash

shell-db:
	docker compose exec postgres psql -U $${POSTGRES_USER} -d $${POSTGRES_DB}

redis-cli:
	docker compose exec redis redis-cli -a $${REDIS_PASSWORD}

# MinIO bucket creation (run once after first start)
init-buckets:
	docker compose exec api python -m app.scripts.init_storage

# Production
prod-up:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

prod-down:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml down
