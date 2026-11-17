import { randomUUID } from 'node:crypto'
import { getDatabase } from '../database/connection.js'
import {
  assertCanCreateTask,
  assertCanReadTask,
  assertCanUpdateTask,
  taskReadScope,
} from './task-access-service.js'

const priorities = new Set(['low', 'normal', 'high', 'urgent'])

const transitions = {
  queued: ['assigned', 'cancelled'],
  assigned: ['queued', 'running', 'awaiting_approval', 'blocked_human_intervention', 'cancelled'],
  running: ['verifying', 'awaiting_approval', 'blocked_human_intervention', 'failed', 'cancelled'],
  verifying: ['running', 'completed', 'awaiting_approval', 'blocked_human_intervention', 'failed'],
  awaiting_approval: ['assigned', 'running', 'blocked_human_intervention', 'cancelled'],
  blocked_human_intervention: ['assigned', 'running', 'cancelled'],
  failed: ['queued', 'cancelled'],
  completed: [],
  cancelled: [],
}

function requiredText(value, field, maxLength) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new TypeError(`${field} must be a non-empty string of at most ${maxLength} characters.`)
  }
  return value.trim()
}

function validateActor(actor) {
  if (!actor || !['system', 'human', 'ai_employee'].includes(actor.type)) {
    throw new TypeError('Actor type must be system, human or ai_employee.')
  }
  return { type: actor.type, id: requiredText(actor.id, 'Actor ID', 120) }
}

function recordEvent(db, taskId, actor, action, previousStatus, newStatus, details) {
  db.prepare(`
    INSERT INTO task_events (
      id, task_id, actor_type, actor_id, action,
      previous_status, new_status, details_json, occurred_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(), taskId, actor.type, actor.id, action,
    previousStatus, newStatus, JSON.stringify(details),
    new Date().toISOString(),
  )
}

function readTask(id) {
  const db = getDatabase()
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
  if (!task) return null

  const events = db.prepare(`
    SELECT id, actor_type, actor_id, action, previous_status,
      new_status, details_json, occurred_at
    FROM task_events
    WHERE task_id = ?
    ORDER BY occurred_at ASC, rowid ASC
  `).all(id).map(event => ({
    ...event,
    details: JSON.parse(event.details_json),
  }))

  return { ...task, events }
}

export function createTask(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError('Task input is required.')
  }

  const title = requiredText(input.title, 'Title', 200)
  const description = typeof input.description === 'string' ? input.description : ''
  if (description.length > 10000) throw new TypeError('Description is too long.')

  const department = requiredText(input.department, 'Department', 120)
  const createdBy = requiredText(input.createdBy, 'Created by', 120)
  const actor = validateActor(input.actor)
  const priority = input.priority ?? 'normal'
  if (!priorities.has(priority)) throw new TypeError('Invalid task priority.')

  if (input.assignedEmployee != null) {
    throw new TypeError('Task assignment must use the authorised assignment workflow.')
  }

  const dueAt = input.dueAt ?? null
  if (dueAt !== null && (typeof dueAt !== 'string' || !Number.isFinite(Date.parse(dueAt)))) {
    throw new TypeError('Due date must be a valid date string.')
  }

  const db = getDatabase()
  const departmentRecord = db.prepare(`
    SELECT id, name, code
    FROM departments
    WHERE lower(id) = lower(?)
      OR lower(code) = lower(?)
      OR lower(name) = lower(?)
    LIMIT 1
  `).get(department, department, department)

  if (!departmentRecord) throw new TypeError('Select a valid registered department.')
  assertCanCreateTask(departmentRecord.id, input.identity)

  const id = randomUUID()
  const now = new Date().toISOString()

  db.exec('BEGIN IMMEDIATE')
  try {
    db.prepare(`
      INSERT INTO tasks (
        id, title, description, department, department_id,
        assigned_employee, created_by, priority, status,
        due_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, 'queued', ?, ?, ?)
    `).run(
      id, title, description, departmentRecord.name, departmentRecord.id,
      createdBy, priority, dueAt, now, now,
    )

    recordEvent(
      db, id, actor, 'task_created', null, 'queued',
      { title, department: departmentRecord.name, departmentId: departmentRecord.id, priority },
    )
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  return readTask(id)
}

export function transitionTask(taskId, nextStatus, actorInput, identity, details = {}) {
  const id = requiredText(taskId, 'Task ID', 120)
  const actor = validateActor(actorInput)

  if (!Object.hasOwn(transitions, nextStatus)) {
    throw new TypeError('Invalid task status.')
  }
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    throw new TypeError('Task event details must be an object.')
  }

  const db = getDatabase()
  db.exec('BEGIN IMMEDIATE')
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
    if (!task) throw new Error('Task not found.')

    assertCanUpdateTask(task, identity)

    if (!transitions[task.status].includes(nextStatus)) {
      throw new Error(`Transition from ${task.status} to ${nextStatus} is not allowed.`)
    }

    const now = new Date().toISOString()
    db.prepare(`
      UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?
    `).run(nextStatus, now, id)

    recordEvent(db, id, actor, 'status_changed', task.status, nextStatus, details)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  return readTask(id)
}

export function getTask(taskId, identity) {
  const id = requiredText(taskId, 'Task ID', 120)
  const task = readTask(id)
  if (!task) return null
  assertCanReadTask(task, identity)
  return task
}

export function listTasks(filters = {}, identity) {
  const db = getDatabase()
  const scope = taskReadScope(identity)
  const conditions = [`(${scope.sql})`]
  const values = [...scope.params]

  for (const [field, column] of [
    ['status', 'tasks.status'],
    ['department', 'tasks.department'],
    ['assignedEmployee', 'tasks.assigned_employee'],
  ]) {
    if (filters[field] !== undefined) {
      conditions.push(`${column} = ?`)
      values.push(requiredText(filters[field], field, 120))
    }
  }

  const limit = Number.isInteger(filters.limit)
    ? Math.max(1, Math.min(filters.limit, 100))
    : 50

  return db.prepare(`
    SELECT tasks.*
    FROM tasks
    WHERE ${conditions.join(' AND ')}
    ORDER BY tasks.created_at DESC
    LIMIT ?
  `).all(...values, limit)
}
