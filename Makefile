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
        test test-api test-admin lint format

help: ## List all commands
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "} {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

# ---- Setup

setup: env build install key up ## First run: env files, images, dependencies, app key, start everything

env: ## Create the .env files from the examples (never overwrites existing ones)
	@test -f .env || cp .env.example .env
	@test -f api-gateway/.env || cp api-gateway/.env.example api-gateway/.env
	@test -f admin-service/.env || cp admin-service/.env.example admin-service/.env

build: ## Build the Docker images
	$(COMPOSE) build

install: ## Install Node and Composer dependencies
	$(API_RUN) npm ci
	$(ADMIN_RUN) composer install

key: ## Generate the Laravel app key (only when it's missing)
	@grep -q '^APP_KEY=base64:' admin-service/.env || $(ADMIN_RUN) php artisan key:generate

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

# ---- Quality

test: test-api test-admin ## Run all tests

test-api: ## Run the NestJS unit and e2e tests
	$(API_EXEC) npm test
	$(API_EXEC) npm run test:e2e

test-admin: ## Run the Laravel tests
	$(ADMIN_EXEC) php artisan test

lint: ## Check code style without changing files
	$(API_EXEC) npm run lint
	$(API_EXEC) npx prettier --check "src/**/*.ts" "test/**/*.ts"
	$(ADMIN_EXEC) ./vendor/bin/pint --test

format: ## Fix code style
	$(API_EXEC) npm run format
	$(ADMIN_EXEC) ./vendor/bin/pint
