# Shared base: PHP-FPM with the extensions the app needs at runtime
FROM php:8.4-fpm-alpine AS base

# install-php-extensions installs each extension's build dependencies and cleans them up afterwards
COPY --from=mlocati/php-extension-installer:2 /usr/bin/install-php-extensions /usr/local/bin/

# pdo_pgsql: PostgreSQL | redis: cache, sessions, queues | pcntl: graceful queue workers | zip: Composer downloads
# gd: product image thumbnails
RUN install-php-extensions pdo_pgsql redis pcntl zip gd

# Product images and CSV imports up to 10 MB (nginx allows the same)
RUN printf "upload_max_filesize=10M\npost_max_size=12M\n" > "$PHP_INI_DIR/conf.d/uploads.ini"

WORKDIR /app

# Development image: the source code is mounted from the host (see docker-compose.yml).
# The production stage is added in the deployment step.
FROM base AS dev

# pcov collects code coverage for the test suite
RUN install-php-extensions pcov

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

# The container runs as your host user, which has no home directory in the image —
# give tools (Composer cache, tinker config) a writable home
ENV HOME=/tmp
