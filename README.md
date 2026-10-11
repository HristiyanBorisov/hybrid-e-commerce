# Hybrid E-commerce Platform

A Laravel admin panel and a NestJS API gateway, each with its own PostgreSQL database.

| Folder               | What it is                                                     |
|----------------------|----------------------------------------------------------------|
| `api-gateway/`       | NestJS — public REST API (users, inventory, orders)            |
| `admin-service/`     | Laravel — admin panel (catalog, order management, reports)     |
| `docker/`            | nginx and PostgreSQL configuration                             |
| `docker-compose.yml` | All services                                                   |
| `Makefile`           | Every command you need — run `make` to list them               |

## Quick start

Requirements: Docker (with Compose) and `make`. Nothing else needs to be installed locally.

```bash
make setup
```

| URL                              | What                                  |
|----------------------------------|---------------------------------------|
| http://localhost:8080            | Admin panel (Laravel)                 |
| http://localhost:8080/api/health | API gateway (NestJS)                  |
| http://localhost:8025            | Mailpit — catches all outgoing email  |

> Full documentation (API reference, design decisions) is added as the project progresses.
