import { login, logout } from '../auth/auth-service.js'
import { authenticateSession } from '../auth/session-service.js'
import { sendJson } from '../services/http-response.js'
import {
  listDepartments,
  listWorkforcePositions,
} from '../services/organization-service.js'
import { createTask, getTask, listTasks, transitionTask } from '../services/task-service.js'
import { createOrganizationUnit, createWorkforcePost, createWorkforceAppointment, listOrganizationUnits, listWorkforcePosts, listWorkforceAppointments } from "../services/workforce-service.js"

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

function handleProtectedRead(req, res, permission, read) {
  const token = getSessionToken(req)
  const identity = token ? authenticateSession(token) : null

  if (!identity) {
    return sendJson(res, 401, { error: 'Authentication required.' })
  }

  const requiredPermissions = Array.isArray(permission) ? permission : [permission]
  if (!requiredPermissions.some(item => identity.user.permissions.includes(item))) {
    return sendJson(res, 403, { error: 'Permission denied.' })
  }

  try {
    const payload = read(identity)
    if (payload === null) return sendJson(res, 404, { error: 'Task not found.' })
    return sendJson(res, 200, payload)
  } catch (error) {
    if (error.message === 'Task not found.') return sendJson(res, 404, { error: 'Task not found.' })
    if (["Organisation unit not found.", "Workforce position not found.", "Reporting post not found.", "Employee identity not found.", "Workforce post not found."].includes(error.message)) return sendJson(res, 404, { error: error.message });
    if (error.code && error.code.startsWith("SQLITE_CONSTRAINT")) return sendJson(res, 409, { error: "The requested change conflicts with an existing record." });

    if (error.message === 'Permission denied.') return sendJson(res, 403, { error: 'Permission denied.' })
    if (error instanceof TypeError) return sendJson(res, 400, { error: error.message })
    throw error
  }
}

async function handleProtectedWrite(req, res, permission, write, successStatus = 200) {
  if (!isSameOrigin(req)) {
    return sendJson(res, 403, { error: 'Cross-origin request blocked.' })
  }

  const token = getSessionToken(req)
  const identity = token ? authenticateSession(token) : null
  if (!identity) return sendJson(res, 401, { error: 'Authentication required.' })
  const requiredPermissions = Array.isArray(permission) ? permission : [permission]
  if (!requiredPermissions.some(item => identity.user.permissions.includes(item))) {
    return sendJson(res, 403, { error: 'Permission denied.' })
  }

  let body
  try {
    body = await readJsonBody(req)
  } catch (error) {
    return sendJson(res, error.status || 400, { error: error.message })
  }

  try {
    return sendJson(res, successStatus, write(body, identity))
  } catch (error) {
    if (error instanceof TypeError) return sendJson(res, 400, { error: error.message })
    if (error.message === 'Task not found.') return sendJson(res, 404, { error: error.message })
    if (["Organisation unit not found.", "Workforce position not found.", "Reporting post not found.", "Employee identity not found.", "Workforce post not found."].includes(error.message)) return sendJson(res, 404, { error: error.message });
    if (error.code && error.code.startsWith("SQLITE_CONSTRAINT")) return sendJson(res, 409, { error: "The requested change conflicts with an existing record." });

    if (error.message === 'Permission denied.') return sendJson(res, 403, { error: error.message })
    if (error.message.startsWith('Transition from ') && error.message.endsWith(' is not allowed.')) {
      return sendJson(res, 409, { error: error.message })
    }
    throw error
  }
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

  if (url.pathname === '/api/departments') {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return sendJson(res, 405, { error: 'Method not allowed.' })
    }
    return handleProtectedRead(req, res, 'departments.read', () => ({
      departments: listDepartments(),
    }))
  }

  if (url.pathname === '/api/workforce/positions') {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return sendJson(res, 405, { error: 'Method not allowed.' })
    }
    return handleProtectedRead(req, res, 'workforce.read', () => ({
      positions: listWorkforcePositions(),
    }))
  }

  if (url.pathname === "/api/workforce/units" || url.pathname === "/api/workforce/posts" || url.pathname === "/api/workforce/appointments") {
    const resource = url.pathname.endsWith("/units") ? "units" : url.pathname.endsWith("/posts") ? "posts" : "appointments";
    const readers = { units: listOrganizationUnits, posts: listWorkforcePosts, appointments: listWorkforceAppointments };
    const creators = { units: createOrganizationUnit, posts: createWorkforcePost, appointments: createWorkforceAppointment };
    const createPermission = resource === "appointments" ? "workforce.appointments.manage" : "workforce.structure.manage";
    if (req.method === "GET") {
      return handleProtectedRead(req, res, "workforce.read", () => ({ [resource]: readers[resource]() }));
    }
    if (req.method === "POST") {
      return handleProtectedWrite(req, res, createPermission, (body, identity) => ({
        [resource === "units" ? "unit" : resource === "posts" ? "post" : "appointment"]: creators[resource](body, identity),
      }), 201);
    }
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  if (url.pathname === '/api/tasks') {
    if (req.method === 'GET') {
      const rawLimit = url.searchParams.get('limit')
      const limit = rawLimit === null ? undefined : Number(rawLimit)
      return handleProtectedRead(req, res, 'tasks.read', (identity) => ({
        tasks: listTasks({
          status: url.searchParams.get('status') ?? undefined,
          department: url.searchParams.get('department') ?? undefined,
          assignedEmployee: url.searchParams.get('assignedEmployee') ?? undefined,
          limit,
        }, identity),
      }))
    }
    if (req.method === 'POST') {
      return handleProtectedWrite(req, res, ['tasks.create', 'tasks.create_all'], (body, identity) => ({
        task: createTask({
          ...body,
          createdBy: identity.user.id,
          actor: { type: 'human', id: identity.user.id },
          identity,
        }),
      }), 201)
    }
    res.setHeader('Allow', 'GET, POST')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  const taskStatusMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/status$/)
  if (taskStatusMatch) {
    if (req.method !== 'PATCH') {
      res.setHeader('Allow', 'PATCH')
      return sendJson(res, 405, { error: 'Method not allowed.' })
    }
    let taskId
    try {
      taskId = decodeURIComponent(taskStatusMatch[1])
    } catch {
      return sendJson(res, 400, { error: 'Invalid task ID.' })
    }
    return handleProtectedWrite(req, res, ['tasks.update_assigned', 'tasks.update_department', 'tasks.update_all'], (body, identity) => {
      if (typeof body.status !== 'string') throw new TypeError('A task status is required.')
      return {
        task: transitionTask(
          taskId,
          body.status,
          { type: 'human', id: identity.user.id },
          identity,
          body.details ?? {},
        ),
      }
    })
  }

  const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/)
  if (taskMatch) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return sendJson(res, 405, { error: 'Method not allowed.' })
    }
    let taskId
    try {
      taskId = decodeURIComponent(taskMatch[1])
    } catch {
      return sendJson(res, 400, { error: 'Invalid task ID.' })
    }
    return handleProtectedRead(req, res, 'tasks.read', (identity) => {
      const task = getTask(taskId, identity)
      return task ? { task } : null
    })
  }

  if (url.pathname.startsWith('/api/auth/')) {
    res.setHeader('Allow', 'GET, POST')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  return sendJson(res, 404, { error: 'API route not found.' })
}
