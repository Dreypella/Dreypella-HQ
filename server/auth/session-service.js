import { randomUUID } from 'node:crypto'
import { getDatabase } from '../database/connection.js'
import { createOpaqueToken, hashToken } from './crypto.js'

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000

export function createSession(userId) {
  const db = getDatabase()
  const token = createOpaqueToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS).toISOString()

  db.prepare(`
    INSERT INTO sessions (
      id, user_id, token_hash, created_at, expires_at, last_seen_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    userId,
    hashToken(token),
    now.toISOString(),
    expiresAt,
    now.toISOString()
  )

  return { token, expiresAt }
}

export function authenticateSession(token) {
  if (typeof token !== 'string' || token.length < 32 || token.length > 256) {
    return null
  }

  const db = getDatabase()
  const now = new Date().toISOString()

  const session = db.prepare(`
    SELECT s.id AS session_id, s.user_id, s.expires_at,
           u.email, u.display_name, u.status, u.must_change_password
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
      AND s.revoked_at IS NULL
      AND s.expires_at > ?
  `).get(hashToken(token), now)

  if (!session || session.status !== 'active') return null

  db.prepare(`
    UPDATE sessions SET last_seen_at = ?
    WHERE id = ?
  `).run(now, session.session_id)

  const roles = db.prepare(`
    SELECT r.name
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = ?
    ORDER BY r.name
  `).all(session.user_id).map(row => row.name)

  const permissions = db.prepare(`
    SELECT DISTINCT p.id
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = ?
    ORDER BY p.id
  `).all(session.user_id).map(row => row.id)

  return {
    sessionId: session.session_id,
    expiresAt: session.expires_at,
    user: {
      id: session.user_id,
      email: session.email,
      displayName: session.display_name,
      status: session.status,
      mustChangePassword: Boolean(session.must_change_password),
      roles,
      permissions
    }
  }
}

export function revokeSession(token) {
  if (typeof token !== 'string' || token.length < 32 || token.length > 256) {
    return false
  }

  const result = getDatabase().prepare(`
    UPDATE sessions
    SET revoked_at = ?
    WHERE token_hash = ? AND revoked_at IS NULL
  `).run(new Date().toISOString(), hashToken(token))

  return result.changes > 0
}

export function revokeAllUserSessions(userId) {
  const result = getDatabase().prepare(`
    UPDATE sessions
    SET revoked_at = ?
    WHERE user_id = ? AND revoked_at IS NULL
  `).run(new Date().toISOString(), userId)

  return result.changes
}
