import db from "./database";

db.exec(`
	CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    -- Current jobs (queued or completed)
    CREATE TABLE IF NOT EXISTS feed_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('feed', 'seekLeft', 'seekRight', 'syncSchedule')),
        status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued', 'completed')),
        source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual', 'scheduled')),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        completed_at TEXT
    );

    -- Current feeding schedule
    CREATE TABLE IF NOT EXISTS feeding_schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        time TEXT NOT NULL, -- "HH:MM", 24hr
        enabled INTEGER NOT NULL DEFAULT 1
    );

    -- Append-only history of every job event (queued / completed)
    -- CREATE TABLE IF NOT EXISTS feed_job_log (
    --     id INTEGER PRIMARY KEY AUTOINCREMENT,
    --     job_id INTEGER NOT NULL,
    --     event TEXT NOT NULL CHECK(event IN ('queued', 'completed')),
    --     amount_grams REAL,
    --     source TEXT,
    --     event_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    -- );

    -- Append-only history of schedule changes (JSON snapshot per change)
    -- CREATE TABLE IF NOT EXISTS feeding_schedule_log (
    --     id INTEGER PRIMARY KEY AUTOINCREMENT,
    --     schedule_snapshot TEXT NOT NULL,
    --     changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    -- );
`);
