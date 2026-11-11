import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { initializeDatabase, getDatabase } from '../server/database/connection.js'
import { hashPassword, createIdentityId } from '../server/auth/crypto.js'

function askVisible(question) {
  return new Promise((resolve, reject) => {
    const terminal = createInterface({ input: stdin, output: stdout })
    terminal.question(question)
      .then(answer => {
        terminal.close()
        resolve(answer.trim())
      })
      .catch(error => {
        terminal.close()
        reject(error)
      })
  })
}

function askHidden(question) {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
      reject(new Error('CEO bootstrap requires an interactive terminal.'))
      return
    }

    stdout.write(question)
    let answer = ''
    const wasRaw = stdin.isRaw

    function cleanup() {
      stdin.removeListener('data', onData)
      stdin.setRawMode(Boolean(wasRaw))
      stdin.pause()
      stdout.write('\n')
    }

    function onData(chunk) {
      for (const character of chunk.toString()) {
        if (character === '\u0003') {
          cleanup()
          reject(new Error('Input cancelled.'))
          return
        }

        if (character === '\r' || character === '\n') {
          cleanup()
          resolve(answer)
          return
        }

        if (character === '\u007f' || character === '\b') {
          answer = answer.slice(0, -1)
        } else if (character >= ' ') {
          answer += character
        }
      }
    }

    stdin.setRawMode(true)
    stdin.resume()
    stdin.on('data', onData)
  })
}

await initializeDatabase()
const db = getDatabase()

const bootstrapCompleted = db.prepare(
  "SELECT 1 FROM security_events WHERE event_type = 'ceo_bootstrap_completed' LIMIT 1"
).get()

if (bootstrapCompleted) {
  throw new Error('CEO bootstrap has already been completed. This operation cannot be repeated.')
}

const existingCeo = db.prepare(`
  SELECT 1
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE r.id = 'ceo'
  LIMIT 1
`).get()

if (existingCeo) {
  throw new Error('A CEO account already exists. Bootstrap is closed.')
}

const email = (await askVisible('CEO email: ')).toLowerCase()
const displayName = await askVisible('CEO display name: ')
const password = await askHidden('Create CEO password (minimum 12 characters): ')
const confirmation = await askHidden('Confirm CEO password: ')

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error('A valid email address is required.')
}

if (!displayName || displayName.length > 100) {
  throw new Error('Display name must contain 1–100 characters.')
}

if (password.length < 12 || password.length > 256) {
  throw new Error('Password must contain 12–256 characters.')
}

if (password !== confirmation) {
  throw new Error('Passwords do not match.')
}

const passwordData = hashPassword(password)
const userId = createIdentityId()
const now = new Date().toISOString()

db.exec('BEGIN IMMEDIATE')
try {
  const completed = db.prepare(
    "SELECT 1 FROM security_events WHERE event_type = 'ceo_bootstrap_completed' LIMIT 1"
  ).get()

  const ceoExists = db.prepare(`
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE r.id = 'ceo'
    LIMIT 1
  `).get()

  if (completed || ceoExists) {
    throw new Error('CEO bootstrap is already closed.')
  }

  db.prepare(`
    INSERT INTO users (
      id, email, display_name, password_hash, password_salt,
      password_algorithm, status, must_change_password,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'active', 0, ?, ?)
  `).run(
    userId,
    email,
    displayName,
    passwordData.hash,
    passwordData.salt,
    passwordData.algorithm,
    now,
    now
  )

  const ceoRole = db.prepare(
    "SELECT id FROM roles WHERE id = 'ceo'"
  ).get()

  if (!ceoRole) {
    throw new Error('CEO system role is missing.')
  }

  db.prepare(`
    INSERT INTO user_roles (user_id, role_id, granted_at)
    VALUES (?, ?, ?)
  `).run(userId, ceoRole.id, now)

  db.prepare(`
    INSERT INTO security_events (
      id, actor_type, actor_id, event_type, outcome, details_json, occurred_at
    ) VALUES (?, 'system', ?, 'ceo_bootstrap_completed', 'success', ?, ?)
  `).run(
    createIdentityId(),
    userId,
    JSON.stringify({ email, method: 'local_terminal_bootstrap' }),
    now
  )
  db.exec('COMMIT')
} catch (error) {
  try { db.exec('ROLLBACK') } catch {}
  throw error
}


console.log(`CEO account created successfully for ${email}.`)
console.log('The one-time bootstrap is now permanently closed.')
console.log('No login session was created.')
