import { randomUUID } from 'node:crypto'
import { getDatabase } from '../database/connection.js'

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
      ? 'Only an authenticated human authority may decide an approval.'
      : 'Invalid approval request actor.')
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

export function requestApproval({ taskId, actionDescription, requestedBy, actor }) {
  const id = requiredText(taskId, 'Task ID', 120)
  const description = requiredText(actionDescription, 'Action description', 2000)
  const requester = requiredText(requestedBy, 'Requester', 120)
  const verifiedActor = validateActor(actor)
  const db = getDatabase()
  const approvalId = randomUUID()
  const now = new Date().toISOString()

  db.exec('BEGIN IMMEDIATE')
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
    if (!task) throw new Error('Task not found.')
    if (!['assigned', 'running'].includes(task.status)) {
      throw new Error('Approval can only be requested for an assigned or running task.')
    }

    const pending = db.prepare(`
      SELECT id FROM task_approvals WHERE task_id = ? AND status = 'pending'
    `).get(id)
    if (pending) throw new Error('This task already has a pending approval.')

    db.prepare(`
      INSERT INTO task_approvals (
        id, task_id, action_description, requested_by, status, created_at
      ) VALUES (?, ?, ?, ?, 'pending', ?)
    `).run(approvalId, id, description, requester, now)

    db.prepare(`
      UPDATE tasks SET status = 'awaiting_approval', updated_at = ? WHERE id = ?
    `).run(now, id)

    recordEvent(db, id, verifiedActor, 'approval_requested',
      task.status, 'awaiting_approval', {
        approvalId,
        actionDescription: description,
        resumeStatus: task.status,
      })

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  return getApproval(approvalId)
}

export function decideApproval(approvalId, decision, actor, decisionNote = '') {
  const id = requiredText(approvalId, 'Approval ID', 120)
  const reviewer = validateActor(actor, true)
  if (!['approved', 'rejected'].includes(decision)) {
    throw new TypeError('Decision must be approved or rejected.')
  }
  if (typeof decisionNote !== 'string' || decisionNote.length > 2000) {
    throw new TypeError('Decision note must be text of at most 2000 characters.')
  }

  const db = getDatabase()
  db.exec('BEGIN IMMEDIATE')
  try {
    const approval = db.prepare('SELECT * FROM task_approvals WHERE id = ?').get(id)
    if (!approval) throw new Error('Approval request not found.')
    if (approval.status !== 'pending') throw new Error('Approval request is no longer pending.')

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(approval.task_id)
    if (!task || task.status !== 'awaiting_approval') {
      throw new Error('The task is not awaiting approval.')
    }

    const requestEvent = db.prepare(`
      SELECT details_json FROM task_events
      WHERE task_id = ? AND action = 'approval_requested'
      ORDER BY rowid DESC LIMIT 1
    `).get(task.id)

    const requestDetails = requestEvent ? JSON.parse(requestEvent.details_json) : {}
    if (requestDetails.approvalId !== id) {
      throw new Error('Approval request does not match the task pending state.')
    }

    const nextStatus = requestDetails.resumeStatus

    if (!['assigned', 'running'].includes(nextStatus)) {
      throw new Error('The original task state cannot safely be restored.')
    }

    const now = new Date().toISOString()
    db.prepare(`
      UPDATE task_approvals
      SET status = ?, reviewed_by = ?, decision_note = ?, reviewed_at = ?
      WHERE id = ? AND status = 'pending'
    `).run(decision, reviewer.id, decisionNote.trim(), now, id)

    db.prepare(`
      UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?
    `).run(nextStatus, now, task.id)

    recordEvent(db, task.id, reviewer, `approval_${decision}`,
      task.status, nextStatus, {
        approvalId: id,
        decision,
        decisionNote: decisionNote.trim(),
      })

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  return getApproval(id)
}

export function getApproval(approvalId) {
  const id = requiredText(approvalId, 'Approval ID', 120)
  return getDatabase().prepare(
    'SELECT * FROM task_approvals WHERE id = ?'
  ).get(id) ?? null
}

export function listApprovals(status = 'pending', limit = 50) {
  if (!['pending', 'approved', 'rejected', 'cancelled', 'all'].includes(status)) {
    throw new TypeError('Invalid approval status filter.')
  }
  const safeLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, 100)) : 50
  const db = getDatabase()
  return status === 'all'
    ? db.prepare('SELECT * FROM task_approvals ORDER BY created_at DESC LIMIT ?').all(safeLimit)
    : db.prepare('SELECT * FROM task_approvals WHERE status = ? ORDER BY created_at DESC LIMIT ?').all(status, safeLimit)
}
