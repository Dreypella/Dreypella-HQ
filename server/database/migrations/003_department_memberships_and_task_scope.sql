-- Department membership, scoped task authority and auditable assignments.
-- Existing migrations are intentionally left unchanged.

ALTER TABLE tasks
ADD COLUMN department_id TEXT REFERENCES departments(id) ON DELETE RESTRICT;

UPDATE tasks
SET department_id = (
  SELECT d.id
  FROM departments d
  WHERE lower(trim(tasks.department)) IN
    (lower(d.id), lower(d.code), lower(d.name))
  LIMIT 1
)
WHERE department_id IS NULL;

CREATE INDEX idx_tasks_department_id
ON tasks(department_id);

CREATE TABLE user_department_memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  membership_role TEXT NOT NULL DEFAULT 'member'
    CHECK(membership_role IN ('member', 'manager', 'head')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active', 'suspended')),
  granted_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, department_id)
);

CREATE INDEX idx_department_memberships_user
ON user_department_memberships(user_id, status);

CREATE INDEX idx_department_memberships_department
ON user_department_memberships(department_id, status, membership_role);

CREATE TABLE department_membership_events (
  id TEXT PRIMARY KEY,
  membership_id TEXT NOT NULL
    REFERENCES user_department_memberships(id) ON DELETE RESTRICT,
  actor_type TEXT NOT NULL CHECK(actor_type IN ('human', 'system')),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  previous_state_json TEXT,
  new_state_json TEXT NOT NULL CHECK(json_valid(new_state_json)),
  reason TEXT NOT NULL DEFAULT '',
  occurred_at TEXT NOT NULL
);

CREATE INDEX idx_membership_events_membership
ON department_membership_events(membership_id, occurred_at);

CREATE TRIGGER prevent_membership_event_update
BEFORE UPDATE ON department_membership_events
BEGIN
  SELECT RAISE(ABORT, 'Membership events are immutable.');
END;

CREATE TRIGGER prevent_membership_event_delete
BEFORE DELETE ON department_membership_events
BEGIN
  SELECT RAISE(ABORT, 'Membership events are immutable.');
END;

CREATE TABLE task_assignments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
  assignee_type TEXT NOT NULL
    CHECK(assignee_type IN ('human', 'ai_employee')),
  assignee_id TEXT NOT NULL,
  assigned_by_type TEXT NOT NULL
    CHECK(assigned_by_type IN ('human', 'ai_employee', 'system')),
  assigned_by_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  assigned_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE UNIQUE INDEX idx_one_active_task_assignment
ON task_assignments(task_id)
WHERE revoked_at IS NULL;

CREATE INDEX idx_task_assignments_assignee
ON task_assignments(assignee_type, assignee_id, revoked_at);

CREATE INDEX idx_task_assignments_task
ON task_assignments(task_id, assigned_at);

INSERT OR IGNORE INTO permissions (id, description) VALUES
  ('tasks.scope_all', 'Read tasks across all departments'),
  ('tasks.create_all', 'Create tasks across all departments'),
  ('tasks.update_all', 'Update tasks across all departments'),
  ('tasks.update_department', 'Update tasks within authorised departments'),
  ('tasks.assign', 'Assign and reassign tasks within authorised scope'),
  ('departments.manage_members', 'Manage department memberships and leadership');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id, granted_at)
SELECT 'ceo', id, datetime('now')
FROM permissions
WHERE id IN (
  'tasks.scope_all',
  'tasks.create_all',
  'tasks.update_all',
  'tasks.update_department',
  'tasks.assign',
  'departments.manage_members'
);
