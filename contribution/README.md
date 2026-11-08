# Database Backup & Restore Guide

This project provides a **pure Node.js, zero-external-dependency, fully cross-platform (Windows / macOS / Linux)** one-click backup and restore toolset for PostgreSQL databases.

No host-level PostgreSQL client installation (`pg_dump` / `psql` / `pg_restore`) or running Docker container is required. It works out-of-the-box once project npm dependencies are installed.

---

## Quick Start

Execute the following commands from the project root via `npm`:

### 1. Database Backup

Exports the active database into a gzip-compressed JSON archive saved under the `db_backup/` directory:

```bash
npm run db:backup
```

* Default target database: `postgresql://postgres:postgres@10.0.0.237:5432/divination_dev`
* Generated artifact naming convention: `db_backup/backup_<database_name>_<YYYYMMDD_HHMMSS>.json.gz`

### 2. Database Restore

Restores a backup archive into the target database. The restore runner automatically identifies and restores the **most recent backup file** inside `db_backup/`:

```bash
# Method 1: Standard interactive restore (prompts confirmation to prevent accidental overwrites)
npm run db:restore

# Method 2: Silent non-interactive restore (skips confirmation prompt, ideal for CI/scripts)
npm run db:restore -- --force
```

Once restoration completes, launch the local development server:
```bash
npm run dev
```

---

## Directory Structure

```text
chinese-divination/
├── db_backup/
│   ├── backup.mjs        # Cross-platform backup runner (Node.js ESM)
│   ├── restore.mjs       # Cross-platform restore runner (Node.js ESM)
│   └── backup_*.json.gz  # Exported gzip backups (automatically ignored in .gitignore)
└── contribution/
    └── README.md         # This document
```
