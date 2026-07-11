export const JOB_TYPES = [
  "feed",
  "seekLeft",
  "seekRight",
  "syncSchedule",
] as const;

export type JobType = (typeof JOB_TYPES)[number];

export type JobStatus = "queued" | "completed";
export type JobSource = "manual" | "scheduled";

export type Job = {
  id: number;
  type: JobType;
  status: JobStatus;
  source: JobSource;
  created_at: string; // '%Y-%m-%dT%H:%M:%fZ
  completed_at: string | null; // '%Y-%m-%dT%H:%M:%fZ
};

export type ScheduleEntry = {
  id?: number;
  time: string; // "HH:MM:SS" 24hr
  enabled?: boolean;
};
