import express from "express";
import cors from "cors";

import jobsRouter from "./routes/jobs";
import scheduleRouter from "./routes/schedule";

const app = express();

app.use(express.json());
app.use(cors());

app.use("/api/jobs", jobsRouter);
app.use("/api/schedule", scheduleRouter);

export default app;
