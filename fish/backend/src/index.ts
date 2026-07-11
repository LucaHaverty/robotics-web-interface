import express from "express";
import cors from "cors";
import Database from "better-sqlite3";

const db = new Database("database.db");

db.exec(`
CREATE TABLE IF NOT EXISTS settings(
    key TEXT PRIMARY KEY,
    value TEXT
)
`);

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static("../frontend/dist"));

app.get("/api/test", (req, res) => {
  res.json({
    hello: "world",
  });
});

app.listen(3000, () => {
  console.log("Server started");
});
