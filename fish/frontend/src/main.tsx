import { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

interface FeedJob {
  id: number;
  status: "queued" | "completed";
  source: "manual" | "scheduled";
  created_at: string;
  completed_at: string | null;
}

interface ScheduleEntry {
  time: string;
  enabled: boolean;
}

const styles = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #16181c; }
  .app {
    font-family: system-ui, sans-serif;
    max-width: 640px;
    margin: 2rem auto;
    padding: 0 1rem;
    color: #e6e6e6;
    background: #16181c;
  }
  h1 { font-size: 1.4rem; margin-bottom: 0.25rem; color: #f2f2f2; }
  .subtitle { color: #9a9a9a; margin-top: 0; margin-bottom: 2rem; }
  section {
    background: #1e2126;
    border: 1px solid #2e3238;
    border-radius: 8px;
    padding: 1rem 1.25rem;
    margin-bottom: 1.5rem;
  }
  section h2 { font-size: 1rem; margin-top: 0; color: #f2f2f2; }
  label { display: block; font-size: 0.85rem; color: #aaa; margin-bottom: 0.25rem; }
  input[type="number"], input[type="time"], input[type="text"] {
    padding: 0.4rem;
    border: 1px solid #3a3f47;
    border-radius: 4px;
    font-size: 0.9rem;
    background: #101317;
    color: #e6e6e6;
  }
  input[type="number"]::-webkit-inner-spin-button {
    filter: invert(1);
  }
  button {
    background: #3a9d6e;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 0.5rem 0.9rem;
    font-size: 0.9rem;
    cursor: pointer;
    margin-top: 0.5rem;
    margin-right: 0.5rem;
  }
  button.secondary { background: #3a3f47; }
  button.danger { background: #b8433f; }
  button:disabled { background: #444; color: #888; cursor: not-allowed; }
  .row { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; }
  .status-box {
    background: #101317;
    border: 1px solid #2e3238;
    border-radius: 6px;
    padding: 0.75rem;
    font-size: 0.85rem;
    margin-top: 0.75rem;
    white-space: pre-wrap;
    font-family: ui-monospace, monospace;
    color: #d0d0d0;
  }
  table { width: 100%; border-collapse: collapse; margin-top: 0.75rem; }
  th, td { text-align: left; padding: 0.4rem; border-bottom: 1px solid #2e3238; font-size: 0.85rem; }
  th { color: #aaa; }
  .error { color: #e08681; font-size: 0.85rem; margin-top: 0.5rem; }
  .config { font-size: 0.8rem; color: #9a9a9a; margin-bottom: 1.5rem; }
  .config input { width: 220px; }
`;

function App() {
  const [baseUrl, setBaseUrl] = useState("http://localhost:5000");

  const [queueResult, setQueueResult] = useState("");

  const [latestJob, setLatestJob] = useState<FeedJob | null>(null);
  const [latestJobError, setLatestJobError] = useState("");
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [scheduleError, setScheduleError] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  // Prevents the autosave effect from firing when `schedule` was just
  // overwritten by data coming FROM the server (initial load, or the
  // reload that happens after a save) rather than a user edit.
  const skipNextAutosave = useRef(true); // true so the very first load doesn't trigger a save

  async function loadSchedule() {
    setScheduleError("");
    try {
      const entries = await api("/api/schedule");
      skipNextAutosave.current = true;
      setSchedule(
        entries.map((e: any) => ({
          time: e.time,
          enabled: !!e.enabled,
        })),
      );
    } catch (err) {
      setScheduleError((err as Error).message);
    }
  }

  useEffect(() => {
    refreshLatestJob();
    loadSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave: fires whenever `schedule` changes as a result of a user
  // edit (add/remove/update row). Debounced so rapid edits (e.g. typing)
  // collapse into a single request.
  useEffect(() => {
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      saveSchedule();
    }, 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule]);

  async function api(path: string, options: RequestInit = {}) {
    const res = await fetch(baseUrl.replace(/\/$/, "") + path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.error || `Request failed (${res.status})`);
    }
    return body;
  }

  async function refreshLatestJob() {
    setLatestJobError("");
    try {
      const job = await api("/api/jobs/sync");
      setLatestJob(job);
    } catch (err) {
      setLatestJob(null);
      setLatestJobError((err as Error).message);
    }
  }

  useEffect(() => {
    refreshLatestJob();
    loadSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function queueJob(jobType: string) {
    setQueueResult("Queuing...");
    try {
      const job = await api("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ type: jobType }),
      });
      setQueueResult(JSON.stringify(job, null, 2));
      await refreshLatestJob();
    } catch (err) {
      setQueueResult("Error: " + (err as Error).message);
    }
  }

  function feed() {
    queueJob("feed");
  }
  function seekLeft() {
    queueJob("seekLeft");
  }
  function seekRight() {
    queueJob("seekRight");
  }
  function updateRow<K extends keyof ScheduleEntry>(
    index: number,
    field: K,
    value: ScheduleEntry[K],
  ) {
    setSchedule((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  function addRow() {
    setSchedule((prev) => [...prev, { time: "08:00", enabled: false }]);
  }

  function removeRow(index: number) {
    setSchedule((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveSchedule() {
    setScheduleError("");
    setSaveStatus("saving");
    try {
      await api("/api/schedule", {
        method: "PUT",
        body: JSON.stringify({ schedule }),
      });
      skipNextAutosave.current = true;
      await loadSchedule();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1500);
    } catch (err) {
      setSaveStatus("idle");
      setScheduleError((err as Error).message);
    }
  }

  return (
    <div className="app">
      <style>{styles}</style>

      <h1>Fish Autofeeder Control</h1>
      <p className="subtitle">
        Queue feedings, check job status, and manage the schedule.
      </p>

      <div className="config">
        <label htmlFor="baseUrl">Backend URL</label>
        <input
          id="baseUrl"
          type="text"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />
      </div>

      <section>
        <h2>Manual Control</h2>
        <div className="row">
          <button onClick={seekLeft}>{"< Tune"}</button>
          <button onClick={feed}>Feed</button>
          <button onClick={seekRight}>{"Tune >"}</button>
        </div>
        {queueResult && <div className="status-box">{queueResult}</div>}
      </section>

      <section>
        <h2>Current Data</h2>
        <div className="row">
          <button className="secondary" onClick={refreshLatestJob}>
            Refresh
          </button>
        </div>
        <div className="status-box">
          {latestJob
            ? JSON.stringify(latestJob, null, 2)
            : latestJobError || "No job loaded yet — click Refresh."}
        </div>
      </section>

      <section>
        <h2>Feeding schedule</h2>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Enabled</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((entry, i) => (
              <tr key={i}>
                <td>
                  <input
                    type="time"
                    value={entry.time}
                    onChange={(e) => updateRow(i, "time", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={entry.enabled}
                    onChange={(e) => updateRow(i, "enabled", e.target.checked)}
                  />
                </td>
                <td>
                  <button className="danger" onClick={() => removeRow(i)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="secondary" onClick={addRow}>
          Add time
        </button>
        <button onClick={saveSchedule}>Save schedule</button>
        <button className="secondary" onClick={loadSchedule}>
          Reload from server
        </button>
        {scheduleError && <div className="error">{scheduleError}</div>}
      </section>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
