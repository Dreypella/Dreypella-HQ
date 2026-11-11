import { login, logout } from '../auth/auth-service.js'
import { authenticateSession } from '../auth/session-service.js'
import { sendJson } from '../services/http-response.js'

const COOKIE_NAME = 'dreypella_hq_session'
const SESSION_SECONDS = 8 * 60 * 60
const MAX_BODY_BYTES = 8 * 1024
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_ATTEMPTS = 10
const loginAttempts = new Map()

function getClientAddress(req) {
  return req.socket.remoteAddress || 'unknown'
}

function getSessionToken(req) {
  const cookieHeader = req.headers.cookie || ''
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0) continue
    if (part.slice(0, separator).trim() === COOKIE_NAME) {
      return part.slice(separator + 1).trim()
    }
  }
  return null
}

function sessionCookie(req, token, maxAge) {
  const secure = Boolean(req.socket.encrypted)
  return [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAge}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ')
}

function isSameOrigin(req) {
  const origin = req.headers.origin
  const host = req.headers.host
  if (typeof origin !== 'string' || typeof host !== 'string') return false

  try {
    const parsed = new URL(origin)
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      parsed.host.toLowerCase() === host.toLowerCase()
    )
  } catch {
    return false
  }
}

function checkLoginLimit(req) {
  const address = getClientAddress(req)
  const now = Date.now()
  let entry = loginAttempts.get(address)

  if (!entry || now - entry.startedAt >= LOGIN_WINDOW_MS) {
    entry = { startedAt: now, count: 0 }
    loginAttempts.set(address, entry)
  }

  entry.count += 1
  return entry.count <= LOGIN_MAX_ATTEMPTS
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || ''
    if (!contentType.toLowerCase().startsWith('application/json')) {
      reject(Object.assign(new Error('Content-Type must be application/json.'), { status: 415 }))
      req.resume()
      return
    }

    let size = 0
    const chunks = []

    req.on('data', chunk => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request body is too large.'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })

    req.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          throw new Error('A JSON object is required.')
        }
        resolve(body)
      } catch {
        reject(Object.assign(new Error('A valid JSON object is required.'), { status: 400 }))
      }
    })

    req.on('error', reject)
  })
}

async function handleLogin(req, res) {
  if (!isSameOrigin(req)) {
    return sendJson(res, 403, { error: 'Cross-origin request blocked.' })
  }

  if (!checkLoginLimit(req)) {
    return sendJson(res, 429, { error: 'Too many login attempts. Try again later.' })
  }

  let body
  try {
    body = await readJsonBody(req)
  } catch (error) {
    return sendJson(res, error.status || 400, { error: error.message })
  }

  if (
    typeof body.email !== 'string' ||
    typeof body.password !== 'string' ||
    body.email.length > 254 ||
    body.password.length > 256
  ) {
    return sendJson(res, 400, { error: 'A valid email and password are required.' })
  }

  try {
    const result = login(body.email, body.password)
    if (!result.success) {
      return sendJson(res, 401, { error: 'Invalid email or password.' })
    }

    return sendJson(res, 200, {
      success: true,
      expiresAt: result.expiresAt,
    }, {
      'Set-Cookie': sessionCookie(req, result.token, SESSION_SECONDS),
    })
  } catch {
    return sendJson(res, 500, { error: 'Login could not be completed.' })
  }
}

function handleSession(req, res) {
  const token = getSessionToken(req)
  const identity = token ? authenticateSession(token) : null

  if (!identity) {
    return sendJson(res, 401, { authenticated: false })
  }

  return sendJson(res, 200, {
    authenticated: true,
    user: identity.user,
    expiresAt: identity.expiresAt,
  })
}

function handleLogout(req, res) {
  if (!isSameOrigin(req)) {
    return sendJson(res, 403, { error: 'Cross-origin request blocked.' })
  }

  const token = getSessionToken(req)
  if (token) logout(token)

  return sendJson(res, 200, { success: true }, {
    'Set-Cookie': sessionCookie(req, '', 0),
  })
}

export async function handleApiRequest(req, res, url) {
  if (url.pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, {
      status: 'ok',
      service: 'Dreypella HQ API',
      environment: 'local-development',
      timestamp: new Date().toISOString(),
    })
  }

  if (url.pathname === '/api' && req.method === 'GET') {
    return sendJson(res, 200, {
      name: 'Dreypella HQ API',
      version: '0.1.0',
      status: 'development-foundation',
    })
  }

  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    return handleLogin(req, res)
  }

  if (url.pathname === '/api/auth/session' && req.method === 'GET') {
    return handleSession(req, res)
  }

  if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
    return handleLogout(req, res)
  }

  if (url.pathname.startsWith('/api/auth/')) {
    res.setHeader('Allow', 'GET, POST')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  return sendJson(res, 404, { error: 'API route not found.' })
}
