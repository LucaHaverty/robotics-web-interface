import { Router } from "express";
import db from "../db/database";

const router = Router();

router.get("/", (req, res) => {
  const schedule = db
    .prepare(`SELECT * FROM feeding_schedule ORDER BY time ASC`)
    .all();
  res.json(schedule);
});

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

router.put("/", (req, res) => {
  const { schedule } = req.body ?? {};

  if (!Array.isArray(schedule)) {
    return res.status(400).json({ error: "schedule must be an array" });
  }

  for (const entry of schedule) {
    if (typeof entry.time !== "string" || !TIME_RE.test(entry.time)) {
      return res.status(400).json({ error: `Invalid time: ${entry.time}` });
    }
  }

  const clearSchedule = db.prepare(`DELETE FROM feeding_schedule`);
  const insertEntry = db.prepare(
    `INSERT INTO feeding_schedule (time, enabled) VALUES (?, ?)`,
  );
  //   const insertLog = db.prepare(
  //     `INSERT INTO feeding_schedule_log (schedule_snapshot) VALUES (?)`,
  //   );

  const saved = db.transaction(() => {
    clearSchedule.run();
    // const entry = schedule[0];
    for (const entry of schedule) {
      if (entry) {
        insertEntry.run(
          entry.time,
          // Number(entry.amount_grams),
          entry.enabled === false ? 0 : 1,
        );
      }
    }

    const newSchedule = db
      .prepare(`SELECT * FROM feeding_schedule ORDER BY time ASC`)
      .all();
    // insertLog.run(JSON.stringify(newSchedule));
    return newSchedule;
  })();

  res.json(saved);
});

export default router;
