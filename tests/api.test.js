import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createServer } from 'node:net'
import { randomBytes, randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { hashPassword } from '../server/auth/crypto.js'

test('isolated task API integration', async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'dreypella-api-'))
  let child
  let db
  let output = ''

  try {
    const probe = createServer()
    await new Promise((resolve, reject) => {
      probe.once('error', reject)
      probe.listen(0, '127.0.0.1', resolve)
    })
    const port = probe.address().port
    await new Promise(resolve => probe.close(resolve))

    child = spawn(process.execPath, ['server/index.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(port), DREYPELLA_DATA_DIR: dataDir },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.stdout.on('data', chunk => { output += chunk })
    child.stderr.on('data', chunk => { output += chunk })

    const base = `http://127.0.0.1:${port}`
    let ready = false
    for (let i = 0; i < 60; i++) {
      if (child.exitCode !== null) break
      try {
        const response = await fetch(`${base}/api/health`)
        if (response.ok) { ready = true; break }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 250))
    }
    assert.equal(ready, true, `API did not start: ${output}`)

    const userId = randomUUID()
    const email = `api-test-${randomUUID()}@example.test`
    const password = randomBytes(18).toString('base64url')
    const credentials = hashPassword(password)
    const now = new Date().toISOString()

    db = new DatabaseSync(path.join(dataDir, 'dreypella-hq.sqlite'))
    db.prepare(`
      INSERT INTO users (
        id,email,display_name,password_hash,password_salt,
        password_algorithm,status,must_change_password,
        created_at,updated_at
      ) VALUES (?,?,?,?,?,?,'active',0,?,?)
    `).run(
      userId, email, 'Temporary API Test CEO',
      credentials.hash, credentials.salt, credentials.algorithm, now, now
    )
    db.prepare(`
      INSERT INTO user_roles (user_id,role_id,granted_at)
      VALUES (?,'ceo',?)
    `).run(userId, now)
    db.close()
    db = null

    const origin = base
    const request = (url, options = {}) => fetch(`${base}${url}`, options)
    const json = (method, body, cookie, requestOrigin = origin) => ({
      method,
      headers: {
        'Content-Type': 'application/json',
        Origin: requestOrigin,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify(body),
    })

    let response = await request('/api/tasks')
    assert.equal(response.status, 401, 'Unauthenticated task listing must be blocked')

    response = await request('/api/tasks', json('POST', { title: 'Blocked cross-origin task', department: 'Executive Office' }, null, 'https://untrusted.example'))
    assert.equal(response.status, 403, 'Cross-origin task creation must be blocked')

    response = await request('/api/auth/login', json('POST', { email, password }))
    assert.equal(response.status, 200, 'Temporary test account login must succeed')
    const setCookie = response.headers.get('set-cookie')
    assert.ok(setCookie, 'Login must issue a session cookie')
    const cookie = setCookie.split(';')[0]

    response = await request('/api/auth/session', { headers: { Cookie: cookie } })
    assert.equal(response.status, 200)
    assert.equal((await response.json()).authenticated, true)

    response = await request('/api/tasks', json('POST', {
      title: 'Isolated API integration task',
      department: 'Executive Office',
      createdBy: 'spoofed-user',
      actor: { type: 'system', id: 'spoofed-actor' },
    }, cookie))
    assert.equal(response.status, 201, 'Valid task creation must succeed')
    const created = (await response.json()).task
    assert.equal(created.created_by, userId, 'Creator must come from authenticated identity')
    assert.equal(created.status, 'queued')
    assert.equal(created.events[0].actor_id, userId)
    assert.equal(created.events[0].actor_type, 'human')

    response = await request('/api/tasks', { headers: { Cookie: cookie } })
    assert.equal(response.status, 200)
    assert.ok((await response.json()).tasks.some(task => task.id === created.id))

    response = await request(`/api/tasks/${created.id}`, { headers: { Cookie: cookie } })
    assert.equal(response.status, 200)
    assert.equal((await response.json()).task.id, created.id)

    response = await request('/api/tasks/nonexistent-test-id', { headers: { Cookie: cookie } })
    assert.equal(response.status, 404)

    response = await request(`/api/tasks/${created.id}/status`, json('PATCH', { status: 'running' }, cookie))
    assert.equal(response.status, 409, 'Invalid queued-to-running transition must be rejected')

    response = await request(`/api/tasks/${created.id}/status`, json('PATCH', { status: 'assigned' }, cookie))
    assert.equal(response.status, 200)
    assert.equal((await response.json()).task.status, 'assigned')

    response = await request(`/api/tasks/${created.id}/status`, json('PATCH', { status: 'running' }, cookie))
    assert.equal(response.status, 200)
    assert.equal((await response.json()).task.status, 'running')

    response = await request('/api/tasks', json('POST', { department: 'Executive Office' }, cookie))
    assert.equal(response.status, 400, 'Missing task title must return validation error')

    response = await request('/api/tasks', { method: 'DELETE', headers: { Origin: origin, Cookie: cookie } })
    assert.equal(response.status, 405, 'Unsupported task method must be rejected')

    // Create isolated staff roles with deliberately limited permissions.
    db = new DatabaseSync(path.join(dataDir, 'dreypella-hq.sqlite'))
    const roles = [
      ['test-reader', ['tasks.read', 'tasks.create']],
      ['test-assignee', ['tasks.read', 'tasks.update_assigned']],
      ['test-global-creator', ['tasks.create_all']],
    ]
    for (const [roleId, permissions] of roles) {
      db.prepare('INSERT INTO roles (id,name,description,is_system_role,created_at) VALUES (?,?,?,0,?)').run(roleId, roleId, 'Isolated API test role', now)
      for (const permission of permissions) {
        db.prepare('INSERT INTO role_permissions (role_id,permission_id,granted_at) VALUES (?,?,?)').run(roleId, permission, now)
      }
    }
    const makeStaff = (roleId, label) => {
      const id = randomUUID()
      const staffEmail = `staff-${randomUUID()}@example.test`
      const staffPassword = randomBytes(18).toString('base64url')
      const secret = hashPassword(staffPassword)
      db.prepare('INSERT INTO users (id,email,display_name,password_hash,password_salt,password_algorithm,status,must_change_password,created_at,updated_at) VALUES (?,?,?,?,?,?,\x27active\x27,0,?,?)').run(id, staffEmail, label, secret.hash, secret.salt, secret.algorithm, now, now)
      db.prepare('INSERT INTO user_roles (user_id,role_id,granted_at) VALUES (?,?,?)').run(id, roleId, now)
      return { id, email: staffEmail, password: staffPassword }
    }
    const reader = makeStaff('test-reader', 'Finance Reader')
    const assignee = makeStaff('test-assignee', 'Task Assignee')
    const globalCreator = makeStaff('test-global-creator', 'Global Task Creator')
    db.prepare('INSERT INTO user_department_memberships (id,user_id,department_id,membership_role,status,granted_by,created_at,updated_at) VALUES (?,?,\x27finance-accounting\x27,\x27member\x27,\x27active\x27,?,?,?)').run(randomUUID(), reader.id, userId, now, now)
    db.close()
    db = null

    const loginStaff = async account => {
      const result = await request('/api/auth/login', json('POST', { email: account.email, password: account.password }))
      assert.equal(result.status, 200, `Staff login failed for ${account.email}`)
      return result.headers.get('set-cookie').split(';')[0]
    }
    const createAsCeo = async (title, department) => {
      const result = await request('/api/tasks', json('POST', { title, department }, cookie))
      assert.equal(result.status, 201)
      return (await result.json()).task
    }
    const financeTask = await createAsCeo('Finance-only task', 'finance-accounting')
    const executiveTask = await createAsCeo('Executive-only task', 'executive-office')

    db = new DatabaseSync(path.join(dataDir, 'dreypella-hq.sqlite'))
    db.prepare('INSERT INTO task_assignments (id,task_id,assignee_type,assignee_id,assigned_by_type,assigned_by_id,reason,assigned_at) VALUES (?,?,\x27human\x27,?,\x27human\x27,?,\x27API access test\x27,?)').run(randomUUID(), financeTask.id, assignee.id, userId, now)
    db.close()
    db = null

    const readerCookie = await loginStaff(reader)
    response = await request('/api/tasks', { headers: { Cookie: readerCookie } })
    assert.equal(response.status, 200)
    let visibleTasks = (await response.json()).tasks
    assert.ok(visibleTasks.some(task => task.id === financeTask.id), 'Department member must see Finance tasks')
    assert.ok(!visibleTasks.some(task => task.id === executiveTask.id), 'Department member must not see Executive tasks')
    response = await request(`/api/tasks?department=Executive%20Office`, { headers: { Cookie: readerCookie } })
    assert.equal(response.status, 200)
    assert.ok(!(await response.json()).tasks.some(task => task.id === executiveTask.id), 'Filters must not widen department scope')
    response = await request(`/api/tasks/${executiveTask.id}`, { headers: { Cookie: readerCookie } })
    assert.equal(response.status, 404, 'Out-of-scope task detail must be hidden')
    response = await request(`/api/tasks/${financeTask.id}/status`, json('PATCH', { status: 'assigned' }, readerCookie))
    assert.equal(response.status, 403, 'Read and department membership alone must not grant update permission')

    const assigneeCookie = await loginStaff(assignee)
    response = await request(`/api/tasks/${financeTask.id}`, { headers: { Cookie: assigneeCookie } })
    assert.equal(response.status, 200, 'Assigned staff member must read their assigned task')
    response = await request(`/api/tasks/${financeTask.id}/status`, json('PATCH', { status: 'assigned' }, assigneeCookie))
    assert.equal(response.status, 200, 'Assigned staff member with update permission may update assigned task')
    response = await request(`/api/tasks/${executiveTask.id}/status`, json('PATCH', { status: 'assigned' }, assigneeCookie))
    assert.equal(response.status, 404, 'Assigned-task permission must not update unrelated tasks')

    const creatorCookie = await loginStaff(globalCreator)
    response = await request('/api/tasks', json('POST', { title: 'Cross-department authorised task', department: 'executive-office' }, creatorCookie))
    assert.equal(response.status, 201, 'tasks.create_all must permit creation without department membership')

    response = await request('/api/auth/logout', json('POST', {}, cookie))
    assert.equal(response.status, 200)

    response = await request('/api/auth/session', { headers: { Cookie: cookie } })
    assert.equal(response.status, 401, 'Revoked session must no longer authenticate')

    console.log('PASS: staff department isolation, assigned-task access, restricted updates and global task creation.')
    console.log('PASS: isolated API authentication, origin protection, task CRUD reads, transitions, validation and logout.')
  } finally {
    if (db) db.close()
    if (child && child.exitCode === null) {
      const exited = new Promise(resolve => child.once('exit', resolve))
      child.kill('SIGTERM')
      await Promise.race([
        exited,
        new Promise(resolve => setTimeout(resolve, 3000)),
      ])
      if (child.exitCode === null) child.kill('SIGKILL')
    }
    await rm(dataDir, { recursive: true, force: true })
  }
})
