import { getDatabase } from '../database/connection.js'

function permissionsOf(identity) {
  return new Set(identity?.user?.permissions ?? [])
}

function requireHuman(identity) {
  if (identity?.user?.id && identity.user.status === 'active') return identity.user.id
  throw new Error('Authentication required.')
}

export function assertCanCreateTask(departmentId, identity) {
  const userId = requireHuman(identity)
  const permissions = permissionsOf(identity)

  if (!permissions.has('tasks.create') && !permissions.has('tasks.create_all')) {
    throw new Error('Permission denied.')
  }
  if (permissions.has('tasks.create_all')) return

  const membership = getDatabase().prepare(`
    SELECT 1
    FROM user_department_memberships
    WHERE user_id = ? AND department_id = ? AND status = 'active'
  `).get(userId, departmentId)

  if (!membership) throw new Error('Permission denied.')
}

export function canReadTask(task, identity) {
  const userId = requireHuman(identity)
  const permissions = permissionsOf(identity)

  if (!permissions.has('tasks.read')) return false
  if (permissions.has('tasks.scope_all')) return true
  if (task.created_by === userId) return true

  const db = getDatabase()

  if (db.prepare(`
    SELECT 1
    FROM user_department_memberships
    WHERE user_id = ? AND department_id = ?
      AND status = 'active'
  `).get(userId, task.department_id)) return true

  return Boolean(db.prepare(`
    SELECT 1
    FROM task_assignments
    WHERE task_id = ? AND assignee_type = 'human'
      AND assignee_id = ? AND revoked_at IS NULL
  `).get(task.id, userId))
}

export function canUpdateTask(task, identity) {
  const userId = requireHuman(identity)
  const permissions = permissionsOf(identity)

  if (permissions.has('tasks.update_all')) return true

  if (permissions.has('tasks.update_assigned')) {
    const assigned = getDatabase().prepare(`
      SELECT 1
      FROM task_assignments
      WHERE task_id = ? AND assignee_type = 'human'
        AND assignee_id = ? AND revoked_at IS NULL
    `).get(task.id, userId)

    if (assigned) return true
  }

  if (permissions.has('tasks.update_department') && task.department_id) {
    return Boolean(getDatabase().prepare(`
      SELECT 1
      FROM user_department_memberships
      WHERE user_id = ? AND department_id = ?
        AND status = 'active'
    `).get(userId, task.department_id))
  }

  return false
}

export function taskReadScope(identity) {
  const userId = requireHuman(identity)
  const permissions = permissionsOf(identity)

  if (!permissions.has('tasks.read')) {
    return { sql: '0 = 1', params: [] }
  }

  if (permissions.has('tasks.scope_all')) {
    return { sql: '1 = 1', params: [] }
  }

  return {
    sql: `(
      tasks.created_by = ?
      OR EXISTS (
        SELECT 1 FROM user_department_memberships m
        WHERE m.user_id = ? AND m.department_id = tasks.department_id
          AND m.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM task_assignments a
        WHERE a.task_id = tasks.id AND a.assignee_type = 'human'
          AND a.assignee_id = ? AND a.revoked_at IS NULL
      )
    )`,
    params: [userId, userId, userId],
  }
}

export function assertCanReadTask(task, identity) {
  if (!canReadTask(task, identity)) throw new Error('Task not found.')
}

export function assertCanUpdateTask(task, identity) {
  if (!canUpdateTask(task, identity)) throw new Error('Task not found.')
}
