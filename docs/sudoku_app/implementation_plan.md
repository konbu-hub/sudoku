# Implementation Plan: Vercel PostgreSQL Support

We will enable the application to use PostgreSQL when deployed to Vercel (for persistent storage) while keeping SQLite for local development.

## User Review Required
> [!IMPORTANT]
> **Vercel Setup Required**: After this change, you will need to:
> 1. Create a "Vercel Postgres" store in your Vercel project dashboard.
> 2. Pull the environment variables (specifically `POSTGRES_URL`) to your Vercel project settings.
> 3. Redeploy the application.

## Proposed Changes

### Database Layer
#### [MODIFY] [database.py](file:///c:/Users/konbu/sudoku/database.py)
- Import `psycopg2` and `os`.
- Update `get_db_connection` to check for `POSTGRES_URL` environment variable.
    - If `POSTGRES_URL` exists: Connect to PostgreSQL using `psycopg2`.
    - If not: Fallback to `sqlite3` (local mode).
- Create a standardized wrapper for executing queries to handle SQL syntax differences:
    - SQLite uses `?` for placeholders.
    - PostgreSQL uses `%s` for placeholders.
    - The wrapper will automatically convert `?` to `%s` if running on Postgres.
- Update `init_db` to handle table creation for Postgres (checking `CREATE TABLE IF NOT EXISTS` syntax compatibility). SQLite syntax used (`AUTOINCREMENT`) differs slightly from Postgres (`SERIAL` or `GENERATED ALWAYS`).
    - We will adjust the schema definitions to be compatible or have conditional schema creation.

### Dependencies
#### [MODIFY] [requirements.txt](file:///c:/Users/konbu/sudoku/requirements.txt)
- Add `psycopg2-binary` for PostgreSQL support.

## Verification Plan

### Automated Tests
- None (No existing test suite).

### Manual Verification
- **Local Testing**:
    - Run `python app.py` locally.
    - Verify the game starts, saves scores, and loads ranking (using local SQLite).
    - Ensure no errors occur.
- **Vercel Testing (User Action)**:
    - User pushes to Vercel.
    - User connects Vercel Postgres.
    - Verify ranking persists after redeployment.
