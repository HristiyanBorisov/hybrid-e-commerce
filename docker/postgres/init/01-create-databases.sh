#!/bin/bash
# Runs once, when the postgres volume is created for the first time.
#
# Database per service: each service gets its own login role that owns two databases
# (the app database and a "_test" one). Access for everyone else is revoked, so neither
# service can connect to the other's data.
set -euo pipefail

create_service_databases() {
    local role="$1" password="$2" database="$3"

    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
        -v role="$role" \
        -v password="$password" \
        -v database="$database" \
        -v test_database="${database}_test" <<'SQL'
CREATE ROLE :"role" LOGIN PASSWORD :'password';

CREATE DATABASE :"database" OWNER :"role";
CREATE DATABASE :"test_database" OWNER :"role";

REVOKE ALL ON DATABASE :"database" FROM PUBLIC;
REVOKE ALL ON DATABASE :"test_database" FROM PUBLIC;
SQL
}

create_service_databases "$ADMIN_DB_USER" "$ADMIN_DB_PASSWORD" "$ADMIN_DB_NAME"
create_service_databases "$GATEWAY_DB_USER" "$GATEWAY_DB_PASSWORD" "$GATEWAY_DB_NAME"
