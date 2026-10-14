# Every command runs inside Docker — you only need Docker and make on your machine.
# Run `make` to list all commands.

.DEFAULT_GOAL := help

# Containers run as your host user, so files they create (vendor/, node_modules/) belong to you
export HOST_UID := $(shell id -u)
export HOST_GID := $(shell id -g)

COMPOSE    := docker compose
API_EXEC   := $(COMPOSE) exec api-gateway
ADMIN_EXEC := $(COMPOSE) exec admin-service
API_RUN    := $(COMPOSE) run --rm --no-deps api-gateway
ADMIN_RUN  := $(COMPOSE) run --rm --no-deps admin-service

.PHONY: help setup env build install key up down restart ps logs shell-api shell-admin \
        assets storage keys migrate fresh seed resync reindex test test-api test-admin coverage lint format

help: ## List all commands
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "} {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

# ---- Setup

setup: env build keys install key assets up storage migrate seed ## First run: everything needed, from env files to demo data

env: ## Create the .env files from the examples (never overwrites existing ones)
	@test -f .env || cp .env.example .env
	@test -f api-gateway/.env || cp api-gateway/.env.example api-gateway/.env
	@test -f admin-service/.env || cp admin-service/.env.example admin-service/.env

build: ## Build the Docker images
	$(COMPOSE) build

install: ## Install Node and Composer dependencies
	$(API_RUN) npm ci
	$(ADMIN_RUN) composer install

keys: ## Create the RSA key pair that signs login tokens (never overwrites existing keys)
	@mkdir -p keys
	$(COMPOSE) run --rm --no-deps -v $(CURDIR)/keys:/keys-out api-gateway npx tsx scripts/generate-jwt-keys.ts /keys-out

assets: ## Build the admin panel's CSS/JS (Tailwind + Vite) in a throwaway Node container
	docker run --rm -u $(HOST_UID):$(HOST_GID) -e HOME=/tmp -v $(CURDIR)/admin-service:/app -w /app node:24-alpine \
		sh -c "npm ci && npm run build"

key: ## Generate the Laravel app key (only when it's missing)
	@grep -q '^APP_KEY=base64:' admin-service/.env || $(ADMIN_RUN) php artisan key:generate

storage: ## Serve uploaded product images at /storage (links public/storage)
	$(ADMIN_EXEC) php artisan storage:link

# ---- Containers

up: ## Start all services and wait until they are healthy
	$(COMPOSE) up -d --wait

down: ## Stop all services
	$(COMPOSE) down

restart: down up ## Restart all services

ps: ## Show the status of each service
	$(COMPOSE) ps

logs: ## Follow the logs (all services, or one: make logs service=api-gateway)
	$(COMPOSE) logs -f $(service)

shell-api: ## Open a shell in the NestJS container
	$(API_EXEC) sh

shell-admin: ## Open a shell in the Laravel container
	$(ADMIN_EXEC) sh

# ---- Database

migrate: ## Run the database migrations of both services
	$(ADMIN_EXEC) php artisan migrate
	$(API_EXEC) npm run migration:run

fresh: ## Drop every table in both databases and run all migrations again
	$(ADMIN_EXEC) php artisan migrate:fresh --drop-types
	$(API_EXEC) npm run schema:drop
	$(API_EXEC) npm run migration:run

seed: ## Fill both databases with demo data (skips what already exists)
	$(ADMIN_EXEC) php artisan db:seed
	@# The gateway stocks the products it has, so it gets the whole catalog first — right away, not queued
	$(ADMIN_EXEC) php artisan catalog:resync --now
	$(API_EXEC) npm run seed

resync: ## Send everything each service copies from the other again: catalog → gateway, orders + stock → admin (queued)
	$(ADMIN_EXEC) php artisan catalog:resync
	$(API_EXEC) npm run resync

reindex: ## Rebuild the product search index (Elasticsearch) from the gateway's catalog
	$(API_EXEC) npm run search:reindex

# ---- Quality

test: test-api test-admin ## Run all tests

test-api: ## Run the NestJS unit and e2e tests
	$(API_EXEC) npm test

test-admin: ## Run the Laravel tests
	$(ADMIN_EXEC) php artisan test

coverage: ## Run the tests with coverage — fails below 90%
	$(API_EXEC) npm run test:cov
	$(ADMIN_EXEC) php artisan test --coverage --min=90

lint: ## Check code style without changing files
	$(API_EXEC) npm run lint
	$(API_EXEC) npx prettier --check "src/**/*.ts" "test/**/*.ts"
	$(ADMIN_EXEC) ./vendor/bin/pint --test

format: ## Fix code style
	$(API_EXEC) npm run format
	$(ADMIN_EXEC) ./vendor/bin/pint
