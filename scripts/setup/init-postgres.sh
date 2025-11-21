#!/bin/bash
set -e

# Script to initialize multiple PostgreSQL databases
# This runs automatically when the postgres container starts

echo "Creating multiple PostgreSQL databases..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE auth;
    CREATE DATABASE users;
    CREATE DATABASE notifications;
    CREATE DATABASE media;
    CREATE DATABASE education_elly_progress;
    CREATE DATABASE code_talk_rooms;
    CREATE DATABASE code_talk_messages;
    CREATE DATABASE code_talk_storage;
    CREATE DATABASE firebook_bookmarks;
    CREATE DATABASE firebook_collections;
    CREATE DATABASE intervalai_reviews;
EOSQL

echo "All databases created successfully!"
