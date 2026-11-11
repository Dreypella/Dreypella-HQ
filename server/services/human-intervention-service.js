import { randomUUID } from 'node:crypto'
import { getDatabase } from '../database/connection.js'

const urgencies = new Set(['low', 'normal', 'high', 'critical'])

function requiredText(value, field, max = 500) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new TypeError(`${field} must be a non-empty string of at most ${max} characters.`)
  }
  return value.trim()
}

function validateActor(actor, humanOnly = false) {
  const allowed = humanOnly ? ['human'] : ['human', 'ai_employee', 'system']
  if (!actor || !allowed.includes(actor.type)) {
    throw new Error(humanOnly
      ? 'Only an authenticated human authority may perform this intervention action.'
      : 'Invalid intervention actor.')
  }

  return {
    type: actor.type,
    id: requiredText(actor.id, 'Actor ID', 120),
  }
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

function getPreviousTaskStatus(db, taskId, interventionId) {
  const event = db.prepare(`
    SELECT details_json FROM task_events
    WHERE task_id = ? AND action = 'human_intervention_requested'
    ORDER BY rowid DESC
  `).all(taskId).find(item => {
    return JSON.parse(item.details_json).interventionId === interventionId
  })

  const previousStatus = event
    ? JSON.parse(event.details_json).resumeStatus
    : null

  if (!['assigned', 'running'].includes(previousStatus)) {
    throw new Error('The original task state cannot safely be restored.')
  }

  return previousStatus
}

export function createIntervention({
  taskId,
  blocker,
  actionRequired,
  urgency = 'normal',
  assignedTo = null,
  deadline = null,
  actor,
}) {
  const id = requiredText(taskId, 'Task ID', 120)
  const blockerText = requiredText(blocker, 'Blocker', 2000)
  const actionText = requiredText(actionRequired, 'Action required', 2000)
  const verifiedActor = validateActor(actor)

  if (!urgencies.has(urgency)) throw new TypeError('Invalid intervention urgency.')

  const assignee = assignedTo == null
    ? null
    : requiredText(assignedTo, 'Assignee', 120)

  if (deadline !== null && (typeof deadline !== 'string' || !Number.isFinite(Date.parse(deadline)))) {
    throw new TypeError('Deadline must be a valid date string.')
  }

  const db = getDatabase()
  const interventionId = randomUUID()
  const now = new Date().toISOString()

  db.exec('BEGIN IMMEDIATE')
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
    if (!task) throw new Error('Task not found.')
    if (!['assigned', 'running'].includes(task.status)) {
      throw new Error('Intervention can only block an assigned or running task.')
    }

    const existing = db.prepare(`
      SELECT id FROM human_interventions
      WHERE task_id = ? AND status IN ('open', 'in_progress')
    `).get(id)
    if (existing) throw new Error('This task already has an unresolved intervention.')

    db.prepare(`
      INSERT INTO human_interventions (
        id, task_id, blocker, action_required, urgency, status,
        assigned_to, deadline, created_at
      ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?)
    `).run(
      interventionId, id, blockerText, actionText,
      urgency, assignee, deadline, now,
    )

    db.prepare(`
      UPDATE tasks SET status = 'blocked_human_intervention', updated_at = ?
      WHERE id = ?
    `).run(now, id)

    recordEvent(db, id, verifiedActor, 'human_intervention_requested',
      task.status, 'blocked_human_intervention', {
        interventionId,
        blocker: blockerText,
        actionRequired: actionText,
        urgency,
        assignedTo: assignee,
        resumeStatus: task.status,
      })

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  return getIntervention(interventionId)
}

export function assignIntervention(interventionId, assignedTo, actor) {
  const id = requiredText(interventionId, 'Intervention ID', 120)
  const assignee = requiredText(assignedTo, 'Assignee', 120)
  const human = validateActor(actor, true)
  const db = getDatabase()

  db.exec('BEGIN IMMEDIATE')
  try {
    const intervention = db.prepare(
      'SELECT * FROM human_interventions WHERE id = ?'
    ).get(id)

    if (!intervention) throw new Error('Intervention not found.')
    if (!['open', 'in_progress'].includes(intervention.status)) {
      throw new Error('Only open interventions can be assigned.')
    }

    db.prepare(`
      UPDATE human_interventions
      SET assigned_to = ?, status = 'in_progress'
      WHERE id = ?
    `).run(assignee, id)

    recordEvent(db, intervention.task_id, human, 'human_intervention_assigned',
      'blocked_human_intervention', 'blocked_human_intervention', {
        interventionId: id,
        assignedTo: assignee,
      })

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  return getIntervention(id)
}

export function resolveIntervention(interventionId, resolutionNote, actor) {
  const id = requiredText(interventionId, 'Intervention ID', 120)
  const note = requiredText(resolutionNote, 'Resolution note', 2000)
  const human = validateActor(actor, true)
  const db = getDatabase()

  db.exec('BEGIN IMMEDIATE')
  try {
    const intervention = db.prepare(
      'SELECT * FROM human_interventions WHERE id = ?'
    ).get(id)

    if (!intervention) throw new Error('Intervention not found.')
    if (!['open', 'in_progress'].includes(intervention.status)) {
      throw new Error('Intervention is no longer open.')
    }

    const task = db.prepare(
      'SELECT * FROM tasks WHERE id = ?'
    ).get(intervention.task_id)

    if (!task || task.status !== 'blocked_human_intervention') {
      throw new Error('The associated task is not blocked by human intervention.')
    }

    const previousStatus = getPreviousTaskStatus(db, task.id, id)
    const now = new Date().toISOString()

    db.prepare(`
      UPDATE human_interventions
      SET status = 'resolved', resolution_note = ?, resolved_at = ?
      WHERE id = ?
    `).run(note, now, id)

    db.prepare(`
      UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?
    `).run(previousStatus, now, task.id)

    recordEvent(db, task.id, human, 'human_intervention_resolved',
      task.status, previousStatus, {
        interventionId: id,
        resolutionNote: note,
      })

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  return getIntervention(id)
}

export function getIntervention(interventionId) {
  const id = requiredText(interventionId, 'Intervention ID', 120)
  return getDatabase().prepare(
    'SELECT * FROM human_interventions WHERE id = ?'
  ).get(id) ?? null
}

export function listInterventions(status = 'open', limit = 50) {
  if (!['open', 'in_progress', 'resolved', 'cancelled', 'all'].includes(status)) {
    throw new TypeError('Invalid intervention status filter.')
  }

  const safeLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, 100)) : 50
  const db = getDatabase()

  return status === 'all'
    ? db.prepare('SELECT * FROM human_interventions ORDER BY created_at DESC LIMIT ?').all(safeLimit)
    : db.prepare('SELECT * FROM human_interventions WHERE status = ? ORDER BY created_at DESC LIMIT ?').all(status, safeLimit)
}
