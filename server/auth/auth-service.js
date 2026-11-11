import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { getDatabase } from '../database/connection.js'
import { verifyPassword } from './crypto.js'
import { createSession, revokeSession } from './session-service.js'

const MAX_FAILED_LOGINS = 5
const LOCK_DURATION_MS = 15 * 60 * 1000
const DUMMY_SALT = Buffer.from('6472657970656c6c612d617574682d31', 'hex')
const DUMMY_HASH = Buffer.alloc(64)

function recordSecurityEvent(actorType, actorId, eventType, outcome, details = {}) {
  getDatabase().prepare(`
    INSERT INTO security_events (
      id, actor_type, actor_id, event_type, outcome, details_json, occurred_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(), actorType, actorId, eventType, outcome,
    JSON.stringify(details), new Date().toISOString()
  )
}

function performDummyVerification(password) {
  const actual = scryptSync(password, DUMMY_SALT, 64, {
    N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024
  })
  return timingSafeEqual(actual, DUMMY_HASH)
}

export function login(emailInput, password) {
  if (
    typeof emailInput !== 'string' ||
    typeof password !== 'string' ||
    emailInput.length > 254 ||
    password.length > 256 ||
    password.length === 0
  ) {
    throw new TypeError('A valid email and password are required.')
  }

  const email = emailInput.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new TypeError('A valid email and password are required.')
  }

  const db = getDatabase()
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)

  if (!user) {
    performDummyVerification(password)
    recordSecurityEvent('anonymous', null, 'login_failed', 'failure', {
      reason: 'invalid_credentials'
    })
    return { success: false, error: 'Invalid email or password.' }
  }

  const now = new Date()
  const nowIso = now.toISOString()

  if (user.status === 'disabled' || (
    user.status === 'locked' &&
    (!user.locked_until || user.locked_until > nowIso)
  )) {
    performDummyVerification(password)
    recordSecurityEvent('anonymous', null, 'login_blocked', 'blocked', {
      reason: 'account_unavailable'
    })
    return { success: false, error: 'Invalid email or password.' }
  }

  if (!verifyPassword(password, user)) {
    const failedCount = user.failed_login_count + 1
    const shouldLock = failedCount >= MAX_FAILED_LOGINS
    const lockedUntil = shouldLock
      ? new Date(now.getTime() + LOCK_DURATION_MS).toISOString()
      : null

    db.prepare(`
      UPDATE users
      SET failed_login_count = ?, status = ?, locked_until = ?, updated_at = ?
      WHERE id = ?
    `).run(
      failedCount, shouldLock ? 'locked' : 'active',
      lockedUntil, nowIso, user.id
    )

    recordSecurityEvent('anonymous', null, 'login_failed',
      shouldLock ? 'blocked' : 'failure', {
        reason: 'invalid_credentials',
        accountId: user.id,
        failedAttempts: failedCount
      })

    return { success: false, error: 'Invalid email or password.' }
  }

  db.prepare(`
    UPDATE users
    SET failed_login_count = 0, status = 'active',
        locked_until = NULL, last_login_at = ?, updated_at = ?
    WHERE id = ?
  `).run(nowIso, nowIso, user.id)

  const session = createSession(user.id)
  recordSecurityEvent('human', user.id, 'login_succeeded', 'success')

  return {
    success: true,
    token: session.token,
    expiresAt: session.expiresAt
  }
}

export function logout(token) {
  const revoked = revokeSession(token)
  if (revoked) {
    recordSecurityEvent('anonymous', null, 'logout_succeeded', 'success')
  }
  return revoked
}
