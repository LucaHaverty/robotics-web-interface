import { Router } from "express";
import { Job, JOB_TYPES, JobType, ScheduleEntry } from "../types";
import db from "../db/database";

const router = Router();

router.post("/", (req, res) => {
  const jobType: JobType = req.body.type;

  if (!JOB_TYPES.includes(jobType)) {
    return res.status(400).json({
      error: "Invalid job type",
    });
  }

  const insertJob = db.prepare(
    `INSERT INTO feed_jobs (type, source) VALUES (?, 'manual')`,
  );

  const job = db.transaction(() => {
    const info = insertJob.run(jobType);
    return db
      .prepare(`SELECT * FROM feed_jobs WHERE id = ?`)
      .get(info.lastInsertRowid) as Job;
  })();

  res.status(201).json(job);
});

router.post("/log-feed", (req, res) => {
  console.log("LOGGING SCHEDULED FEED JOB");
  const insertJob = db.prepare(
    `INSERT INTO feed_jobs (type, status, source, completed_at) VALUES ('feed', 'completed', 'scheduled', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
  );

  const job = db.transaction(() => {
    const info = insertJob.run();
    return db
      .prepare(`SELECT * FROM feed_jobs WHERE id = ?`)
      .get(info.lastInsertRowid) as Job;
  })();

  res.status(201).json(job);
});

/** Return the job at the front of the queue */
router.get("/sync", (req, res) => {
  const job = db
    .prepare(
      `SELECT * FROM feed_jobs WHERE status = 'queued' ORDER BY created_at ASC, id ASC LIMIT 1`,
    )
    .get() as Job | undefined;

  const schedulesRaw = db
    .prepare(`SELECT * FROM feeding_schedule ORDER BY time`)
    .all() as ScheduleEntry[] | undefined;

  let schedules: string[] =
    schedulesRaw
      ?.map((s) => (s.enabled ? s.time : undefined))
      .filter((s) => s !== undefined) ?? [];

  res.json({
    time: Date.now() / 1000,
    job,
    schedule: schedules,
  });
});

router.get("/history", (req, res) => {
  const jobs = db
    .prepare(
      `SELECT * FROM feed_jobs WHERE status = 'queued' ORDER BY created_at DESC, id DESC`,
    )
    .all() as Job[] | undefined;

  if (jobs == undefined) {
    return res.status(400).json({
      error: "Failed to load jobs",
    });
  }
  res.json(jobs);
});

/** Mark a job as complete */
router.patch("/:id/complete", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid job id" });
  }

  const job = db.prepare(`SELECT * FROM feed_jobs WHERE id = ?`).get(id) as
    | Job
    | undefined;

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  if (job.status === "completed") {
    return res.status(409).json({ error: "Job is already complete" });
  }

  const updateJob = db.prepare(
    `UPDATE feed_jobs SET status = 'completed', completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
  );
  //   const insertLog = db.prepare(
  //     `INSERT INTO feed_job_log (job_id, event, amount_grams, source) VALUES (?, 'completed', ?, ?)`,
  //   );

  const updated = db.transaction(() => {
    updateJob.run(id);
    // insertLog.run(id, job.amount_grams, job.source);
    return db.prepare(`SELECT * FROM feed_jobs WHERE id = ?`).get(id) as Job;
  })();

  res.json(updated);
});

export default router;
