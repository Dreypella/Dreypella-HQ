CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  is_system_role INTEGER NOT NULL DEFAULT 0 CHECK(is_system_role IN (0,1)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 1 AND 120),
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_algorithm TEXT NOT NULL DEFAULT 'scrypt' CHECK(password_algorithm = 'scrypt'),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled','locked')),
  must_change_password INTEGER NOT NULL DEFAULT 0 CHECK(must_change_password IN (0,1)),
  failed_login_count INTEGER NOT NULL DEFAULT 0 CHECK(failed_login_count >= 0),
  locked_until TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  granted_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  granted_at TEXT NOT NULL,
  PRIMARY KEY(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at TEXT NOT NULL,
  PRIMARY KEY(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS ai_employees (
  id TEXT PRIMARY KEY,
  employee_code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 1 AND 120),
  department TEXT NOT NULL,
  role_title TEXT NOT NULL,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK(status IN ('active','inactive','suspended')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_authenticated_at TEXT
);

CREATE TABLE IF NOT EXISTS ai_employee_credentials (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES ai_employees(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT 'Primary credential',
  created_at TEXT NOT NULL,
  expires_at TEXT,
  last_used_at TEXT,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL CHECK(actor_type IN ('anonymous','human','ai_employee','system')),
  actor_id TEXT,
  event_type TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('success','failure','blocked','info')),
  details_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(details_json)),
  occurred_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_ai_employees_status ON ai_employees(status);
CREATE INDEX IF NOT EXISTS idx_ai_credentials_employee ON ai_employee_credentials(employee_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_expiry ON sessions(user_id, expires_at, revoked_at);
CREATE INDEX IF NOT EXISTS idx_security_events_time ON security_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_security_events_actor ON security_events(actor_type, actor_id);

INSERT OR IGNORE INTO roles (id,name,description,is_system_role,created_at) VALUES
('ceo','Group CEO','Reserved authority assigned only through protected bootstrap.',1,'2026-01-01T00:00:00.000Z'),
('staff','Staff','Human staff with explicitly granted permissions.',1,'2026-01-01T00:00:00.000Z'),
('ai_employee','AI Employee','AI workforce identity with role-specific permissions.',1,'2026-01-01T00:00:00.000Z');

INSERT OR IGNORE INTO permissions (id,description) VALUES
('dashboard.read','Read permitted dashboard information.'),
('tasks.read','Read tasks within assigned scope.'),
('tasks.create','Create operational tasks.'),
('tasks.update_assigned','Update tasks within assigned scope.'),
('approvals.read','Read approval requests.'),
('approvals.request','Request approval for controlled actions.'),
('approvals.decide','Approve or reject requests when authorised.'),
('interventions.read','Read human-intervention records.'),
('interventions.create','Request human intervention.'),
('interventions.resolve','Resolve human-intervention records when authorised.'),
('users.manage','Create, disable and manage human accounts.'),
('roles.manage','Grant and revoke staff roles and permissions.'),
('ai_employees.manage','Manage AI employee identities.'),
('credentials.rotate','Issue, revoke and rotate AI employee credentials.'),
('security.audit.read','Read security and authentication audit events.'),
('settings.manage','Manage protected company settings.');

INSERT OR IGNORE INTO role_permissions (role_id,permission_id,granted_at)
SELECT 'ceo',id,'2026-01-01T00:00:00.000Z' FROM permissions;

-- Security history is append-only.
CREATE TRIGGER IF NOT EXISTS prevent_security_event_update
BEFORE UPDATE ON security_events
BEGIN
  SELECT RAISE(ABORT, 'Security events are immutable.');
END;

CREATE TRIGGER IF NOT EXISTS prevent_security_event_delete
BEFORE DELETE ON security_events
BEGIN
  SELECT RAISE(ABORT, 'Security events are immutable.');
END;
