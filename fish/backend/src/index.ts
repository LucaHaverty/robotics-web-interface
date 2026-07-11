import express from "express";
import cors from "cors";
import Database from "better-sqlite3";

const PORT: number = 5000;
const db = new Database("database.db");

db.exec(`
	  CREATE TABLE IF NOT EXISTS settings (
		      key TEXT PRIMARY KEY,
		          value TEXT
			    );

			      -- Current jobs (queued or completed)
			        CREATE TABLE IF NOT EXISTS feed_jobs (
					    id INTEGER PRIMARY KEY AUTOINCREMENT,
					        status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued', 'completed')),
						    amount_grams REAL NOT NULL,
						        source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual', 'scheduled')),
							    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
							        completed_at TEXT
								  );

								    -- Append-only history of every job event (queued / completed)
								      CREATE TABLE IF NOT EXISTS feed_job_log (
									          id INTEGER PRIMARY KEY AUTOINCREMENT,
										      job_id INTEGER NOT NULL,
										          event TEXT NOT NULL CHECK(event IN ('queued', 'completed')),
											      amount_grams REAL,
											          source TEXT,
												      event_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
												        );

													  -- Current feeding schedule
													    CREATE TABLE IF NOT EXISTS feeding_schedule (
														        id INTEGER PRIMARY KEY AUTOINCREMENT,
															    time TEXT NOT NULL,        -- "HH:MM", 24hr
															        amount_grams REAL NOT NULL,
																    enabled INTEGER NOT NULL DEFAULT 1
																      );

																        -- Append-only history of schedule changes (JSON snapshot per change)
																	  CREATE TABLE IF NOT EXISTS feeding_schedule_log (
																		      id INTEGER PRIMARY KEY AUTOINCREMENT,
																		          schedule_snapshot TEXT NOT NULL,
																			      changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
																			        );
																				`);

																				const app = express();
																				app.use(express.json());
																				app.use(cors());
																				app.use(express.static("../frontend/dist"));

																				// ---------- Types ----------

																				interface FeedJob {
																					  id: number;
																					    status: "queued" | "completed";
																					      amount_grams: number;
																					        source: "manual" | "scheduled";
																						  created_at: string;
																						    completed_at: string | null;
																				}

																				interface ScheduleEntry {
																					  id?: number;
																					    time: string; // "HH:MM" 24hr
																					      amount_grams: number;
																					        enabled?: boolean;
																				}

																				const DEFAULT_AMOUNT_GRAMS = 5;
																				const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

																				// ---------- Jobs ----------

																				// Queue a new feed job
																				app.post("/api/jobs", (req, res) => {
																					  const { amount_grams, source } = req.body ?? {};

																					    const amount =
																						        amount_grams === undefined ? DEFAULT_AMOUNT_GRAMS : Number(amount_grams);
																					      if (!Number.isFinite(amount) || amount <= 0) {
																						          return res
																							        .status(400)
																								      .json({ error: "amount_grams must be a positive number" });
																								        }

																									  const jobSource = source === "scheduled" ? "scheduled" : "manual";

																									    const insertJob = db.prepare(
																										        `INSERT INTO feed_jobs (status, amount_grams, source) VALUES ('queued', ?, ?)`
																											  );
																											    const insertLog = db.prepare(
																												        `INSERT INTO feed_job_log (job_id, event, amount_grams, source) VALUES (?, 'queued', ?, ?)`
																													  );

																													    const job = db.transaction(() => {
																														        const info = insertJob.run(amount, jobSource);
																															    insertLog.run(info.lastInsertRowid, amount, jobSource);
																															        return db
																																      .prepare(`SELECT * FROM feed_jobs WHERE id = ?`)
																																            .get(info.lastInsertRowid) as FeedJob;
																																	      })();

																																	        res.status(201).json(job);
																				});

																				// Get the most recent job that hasn't been completed yet
																				app.get("/api/jobs/latest", (req, res) => {
																					  const job = db
																					      .prepare(
																						            `SELECT * FROM feed_jobs WHERE status = 'queued' ORDER BY created_at DESC, id DESC LIMIT 1`
																							        )
																								    .get() as FeedJob | undefined;

																								      if (!job) {
																									          return res.status(404).json({ error: "No queued jobs found" });
																										    }

																										      res.json(job);
																				});

																				// Mark a job as complete
																				app.patch("/api/jobs/:id/complete", (req, res) => {
																					  const id = Number(req.params.id);
																					    if (!Number.isInteger(id)) {
																						        return res.status(400).json({ error: "Invalid job id" });
																							  }

																							    const job = db.prepare(`SELECT * FROM feed_jobs WHERE id = ?`).get(id) as
																							        | FeedJob
																								    | undefined;

																								      if (!job) {
																									          return res.status(404).json({ error: "Job not found" });
																										    }
																										      if (job.status === "completed") {
																											          return res.status(409).json({ error: "Job is already complete" });
																												    }

																												      const updateJob = db.prepare(
																													          `UPDATE feed_jobs SET status = 'completed', completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`
																														    );
																														      const insertLog = db.prepare(
																															          `INSERT INTO feed_job_log (job_id, event, amount_grams, source) VALUES (?, 'completed', ?, ?)`
																																    );

																																      const updated = db.transaction(() => {
																																	          updateJob.run(id);
																																		      insertLog.run(id, job.amount_grams, job.source);
																																		          return db.prepare(`SELECT * FROM feed_jobs WHERE id = ?`).get(id) as FeedJob;
																																			    })();

																																			      res.json(updated);
																				});

																				// ---------- Feeding schedule ----------

																				// Get the current feeding schedule
																				app.get("/api/schedule", (req, res) => {
																					  const schedule = db
																					      .prepare(`SELECT * FROM feeding_schedule ORDER BY time ASC`)
																					          .all();
																						    res.json(schedule);
																				});

																				// Replace the feeding schedule
																				app.put("/api/schedule", (req, res) => {
																					  const { schedule } = req.body ?? {};

																					    if (!Array.isArray(schedule)) {
																						        return res.status(400).json({ error: "schedule must be an array" });
																							  }

																							    for (const entry of schedule) {
																								        if (typeof entry.time !== "string" || !TIME_RE.test(entry.time)) {
																										      return res.status(400).json({ error: `Invalid time: ${entry.time}` });
																										          }
																											      const amt = Number(entry.amount_grams);
																											          if (!Number.isFinite(amt) || amt <= 0) {
																													        return res
																														        .status(400)
																															        .json({ error: `Invalid amount_grams for ${entry.time}` });
																																    }
																																      }

																																        const clearSchedule = db.prepare(`DELETE FROM feeding_schedule`);
																																	  const insertEntry = db.prepare(
																																		      `INSERT INTO feeding_schedule (time, amount_grams, enabled) VALUES (?, ?, ?)`
																																		        );
																																			  const insertLog = db.prepare(
																																				      `INSERT INTO feeding_schedule_log (schedule_snapshot) VALUES (?)`
																																				        );

																																					  const saved = db.transaction(() => {
																																						      clearSchedule.run();
																																						          for (const entry of schedule as ScheduleEntry[]) {
																																								        insertEntry.run(
																																										        entry.time,
																																											        Number(entry.amount_grams),
																																												        entry.enabled === false ? 0 : 1
																																													      );
																																													          }
																																														      const newSchedule = db
																																														            .prepare(`SELECT * FROM feeding_schedule ORDER BY time ASC`)
																																															          .all();
																																																      insertLog.run(JSON.stringify(newSchedule));
																																																          return newSchedule;
																																																	    })();

																																																	      res.json(saved);
																				});

																				app.get("/api/test", (req, res) => {
																					  res.json({
																						      hello: "world",
																						        });
																				});

																				app.listen(PORT, () => {
																					  console.log("Server started");
																				});
