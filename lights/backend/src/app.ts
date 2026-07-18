import express from "express";
import cors from "cors";

import apiRouter from "./routes/api";

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static("../frontend/dist"));

app.use("/api", apiRouter);

export default app;
