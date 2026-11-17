-- Organisational structure, authorised posts and workforce appointments.
-- Human and AI identities remain in their separate existing tables.

CREATE TABLE organization_units (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 160),
  unit_type TEXT NOT NULL CHECK(unit_type IN ('group','subsidiary','division','business_unit')),
  parent_unit_id TEXT REFERENCES organization_units(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','retired')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(parent_unit_id IS NULL OR parent_unit_id <> id)
);

CREATE INDEX idx_organization_units_parent
ON organization_units(parent_unit_id, status);

CREATE TABLE workforce_posts (
  id TEXT PRIMARY KEY,
  post_code TEXT NOT NULL UNIQUE,
  position_id TEXT NOT NULL REFERENCES workforce_positions(id) ON DELETE RESTRICT,
  organization_unit_id TEXT NOT NULL REFERENCES organization_units(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'vacant'
    CHECK(status IN ('vacant','occupied','frozen','retired')),
  reports_to_post_id TEXT REFERENCES workforce_posts(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(reports_to_post_id IS NULL OR reports_to_post_id <> id)
);

CREATE INDEX idx_workforce_posts_unit
ON workforce_posts(organization_unit_id, status);

CREATE INDEX idx_workforce_posts_position
ON workforce_posts(position_id);

CREATE INDEX idx_workforce_posts_reporting
ON workforce_posts(reports_to_post_id);

CREATE TABLE workforce_appointments (
  id TEXT PRIMARY KEY,
  employee_type TEXT NOT NULL CHECK(employee_type IN ('human','ai_employee')),
  employee_id TEXT NOT NULL,
  post_id TEXT NOT NULL REFERENCES workforce_posts(id) ON DELETE RESTRICT,
  appointment_type TEXT NOT NULL DEFAULT 'primary'
    CHECK(appointment_type IN ('primary','secondary','acting','temporary')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active','suspended','ended')),
  start_at TEXT NOT NULL,
  end_at TEXT,
  appointed_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(end_at IS NULL OR end_at >= start_at),
  CHECK((status = 'ended' AND end_at IS NOT NULL)
     OR (status IN ('active','suspended') AND end_at IS NULL))
);

CREATE UNIQUE INDEX idx_workforce_post_current_appointment
ON workforce_appointments(post_id)
WHERE end_at IS NULL;

CREATE INDEX idx_workforce_appointments_employee
ON workforce_appointments(employee_type, employee_id, status);

CREATE INDEX idx_workforce_appointments_post
ON workforce_appointments(post_id, start_at);

CREATE TABLE workforce_events (
  id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL
    CHECK(subject_type IN ('organization_unit','post','appointment')),
  subject_id TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK(actor_type IN ('human','system')),
  actor_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  previous_state_json TEXT
    CHECK(previous_state_json IS NULL OR json_valid(previous_state_json)),
  new_state_json TEXT NOT NULL CHECK(json_valid(new_state_json)),
  reason TEXT NOT NULL DEFAULT '',
  occurred_at TEXT NOT NULL
);

CREATE INDEX idx_workforce_events_subject
ON workforce_events(subject_type, subject_id, occurred_at);

CREATE TRIGGER prevent_workforce_event_update
BEFORE UPDATE ON workforce_events
BEGIN
  SELECT RAISE(ABORT, 'Workforce events are immutable.');
END;

CREATE TRIGGER prevent_workforce_event_delete
BEFORE DELETE ON workforce_events
BEGIN
  SELECT RAISE(ABORT, 'Workforce events are immutable.');
END;

INSERT OR IGNORE INTO permissions (id, description) VALUES
('workforce.structure.manage', 'Manage organisational units, authorised posts and reporting structure.'),
('workforce.appointments.manage', 'Appoint, transfer, promote, suspend and end workforce appointments.');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id, granted_at)
SELECT 'ceo', id, '2026-11-16T00:00:00.000Z'
FROM permissions
WHERE id IN ('workforce.structure.manage','workforce.appointments.manage');

INSERT OR IGNORE INTO organization_units
(id, code, name, unit_type, parent_unit_id, status, created_at, updated_at)
VALUES
('dreypella-group','DREYPELLA-GROUP','Dreypella Group','group',NULL,'active',
 '2026-11-16T00:00:00.000Z','2026-11-16T00:00:00.000Z');
