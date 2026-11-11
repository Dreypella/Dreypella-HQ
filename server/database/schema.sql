CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 200),
  description TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL,
  assigned_employee TEXT,
  created_by TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK(status IN (
      'queued', 'assigned', 'running', 'verifying', 'completed',
      'awaiting_approval', 'blocked_human_intervention',
      'failed', 'cancelled'
    )),
  due_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_events (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
  actor_type TEXT NOT NULL
    CHECK(actor_type IN ('system', 'human', 'ai_employee')),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  details_json TEXT NOT NULL DEFAULT '{}'
    CHECK(json_valid(details_json)),
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_approvals (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
  action_description TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  reviewed_by TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'approved', 'rejected', 'cancelled')),
  decision_note TEXT,
  created_at TEXT NOT NULL,
  reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS human_interventions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
  blocker TEXT NOT NULL,
  action_required TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'normal'
    CHECK(urgency IN ('low', 'normal', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK(status IN ('open', 'in_progress', 'resolved', 'cancelled')),
  assigned_to TEXT,
  deadline TEXT,
  resolution_note TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_status
  ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_tasks_department
  ON tasks(department);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_employee
  ON tasks(assigned_employee);

CREATE INDEX IF NOT EXISTS idx_task_events_task
  ON task_events(task_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_approvals_status
  ON task_approvals(status);

CREATE INDEX IF NOT EXISTS idx_interventions_status
  ON human_interventions(status);

-- Task history is append-only: events cannot be edited or deleted.
CREATE TRIGGER IF NOT EXISTS prevent_task_event_update
BEFORE UPDATE ON task_events
BEGIN
  SELECT RAISE(ABORT, 'Task events are immutable.');
END;

CREATE TRIGGER IF NOT EXISTS prevent_task_event_delete
BEFORE DELETE ON task_events
BEGIN
  SELECT RAISE(ABORT, 'Task events are immutable.');
END;
