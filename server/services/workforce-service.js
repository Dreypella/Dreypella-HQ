import { randomUUID } from 'node:crypto'
import { getDatabase } from '../database/connection.js'

const unitTypes = ['group', 'subsidiary', 'division', 'business_unit']
const appointmentTypes = ['primary', 'secondary', 'acting', 'temporary']

function requiredText(value, field, max = 160) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new TypeError(`${field} must be a non-empty string of at most ${max} characters.`)
  }
  return value.trim()
}

function actorId(identity) {
  return requiredText(identity?.user?.id, 'Authenticated actor ID', 120)
}

function recordEvent(db, subjectType, subjectId, actor, eventType, previous, next, reason = '') {
  db.prepare(`
    INSERT INTO workforce_events (
      id, subject_type, subject_id, actor_type, actor_id, event_type,
      previous_state_json, new_state_json, reason, occurred_at
    ) VALUES (?, ?, ?, 'human', ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(), subjectType, subjectId, actor, eventType,
    previous ? JSON.stringify(previous) : null,
    JSON.stringify(next), reason, new Date().toISOString(),
  )
}

function transaction(db, operation) {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = operation()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function listOrganizationUnits() {
  return getDatabase().prepare(`
    SELECT u.id, u.code, u.name, u.unit_type AS unitType,
      u.parent_unit_id AS parentUnitId, p.name AS parentName,
      u.status, u.created_at AS createdAt, u.updated_at AS updatedAt
    FROM organization_units u
    LEFT JOIN organization_units p ON p.id = u.parent_unit_id
    ORDER BY u.unit_type, u.name COLLATE NOCASE
  `).all()
}

export function listWorkforcePosts() {
  return getDatabase().prepare(`
    SELECT p.id, p.post_code AS postCode, p.position_id AS positionId,
      wp.name AS positionName, wp.title AS positionTitle,
      wp.department_id AS departmentId, d.name AS departmentName,
      p.organization_unit_id AS organizationUnitId, u.name AS organizationUnitName,
      p.status, p.reports_to_post_id AS reportsToPostId,
      parent.post_code AS reportsToPostCode,
      parent_wp.title AS reportsToTitle,
      a.id AS currentAppointmentId, a.employee_type AS employeeType,
      a.employee_id AS employeeId,
      CASE WHEN a.employee_type = 'human' THEN human.display_name
           WHEN a.employee_type = 'ai_employee' THEN ai.display_name END AS employeeName,
      a.appointment_type AS appointmentType,
      p.created_at AS createdAt, p.updated_at AS updatedAt
    FROM workforce_posts p
    JOIN workforce_positions wp ON wp.id = p.position_id
    JOIN departments d ON d.id = wp.department_id
    JOIN organization_units u ON u.id = p.organization_unit_id
    LEFT JOIN workforce_posts parent ON parent.id = p.reports_to_post_id
    LEFT JOIN workforce_positions parent_wp ON parent_wp.id = parent.position_id
    LEFT JOIN workforce_appointments a ON a.post_id = p.id AND a.end_at IS NULL
    LEFT JOIN users human ON a.employee_type = 'human' AND human.id = a.employee_id
    LEFT JOIN ai_employees ai ON a.employee_type = 'ai_employee' AND ai.id = a.employee_id
    ORDER BY u.name COLLATE NOCASE, wp.sort_order, p.post_code
  `).all()
}

export function listWorkforceAppointments() {
  return getDatabase().prepare(`
    SELECT a.id, a.employee_type AS employeeType, a.employee_id AS employeeId,
      CASE WHEN a.employee_type = 'human' THEN human.display_name
           WHEN a.employee_type = 'ai_employee' THEN ai.display_name END AS employeeName,
      a.post_id AS postId, p.post_code AS postCode,
      wp.title AS positionTitle, d.name AS departmentName,
      u.name AS organizationUnitName, a.appointment_type AS appointmentType,
      a.status, a.start_at AS startAt, a.end_at AS endAt,
      a.appointed_by AS appointedBy, a.reason,
      a.created_at AS createdAt, a.updated_at AS updatedAt
    FROM workforce_appointments a
    JOIN workforce_posts p ON p.id = a.post_id
    JOIN workforce_positions wp ON wp.id = p.position_id
    JOIN departments d ON d.id = wp.department_id
    JOIN organization_units u ON u.id = p.organization_unit_id
    LEFT JOIN users human ON a.employee_type = 'human' AND human.id = a.employee_id
    LEFT JOIN ai_employees ai ON a.employee_type = 'ai_employee' AND ai.id = a.employee_id
    ORDER BY a.start_at DESC, a.created_at DESC
  `).all()
}

export function createOrganizationUnit(input, identity) {
  const code = requiredText(input.code, 'Unit code', 60).toUpperCase()
  const name = requiredText(input.name, 'Unit name')
  const unitType = input.unitType
  if (!unitTypes.includes(unitType)) throw new TypeError('Invalid organisational unit type.')
  const parentId = input.parentUnitId ?? null
  const reason = typeof input.reason === 'string' ? input.reason.trim().slice(0, 1000) : ''
  const actor = actorId(identity)
  const db = getDatabase()
  const id = randomUUID()
  const now = new Date().toISOString()

  transaction(db, () => {
    if (unitType === 'group' && parentId !== null) {
      throw new TypeError('A group unit cannot have a parent.')
    }
    if (unitType !== 'group' && !parentId) {
      throw new TypeError('A non-group unit must have a parent unit.')
    }
    if (parentId) {
      const parent = db.prepare('SELECT unit_type, status FROM organization_units WHERE id = ?').get(parentId)
      if (!parent) throw new Error('Organisation unit not found.')
      if (parent.status !== 'active') throw new TypeError('Parent organisation unit must be active.')
      const expectedParent = {
        subsidiary: 'group',
        division: 'subsidiary',
        business_unit: 'division',
      }[unitType]
      if (parent.unit_type !== expectedParent) {
        throw new TypeError(`${unitType} units must be created under a ${expectedParent} unit.`)
      }
    }
    db.prepare(`
      INSERT INTO organization_units
      (id, code, name, unit_type, parent_unit_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
    `).run(id, code, name, unitType, parentId, now, now)
    recordEvent(db, 'organization_unit', id, actor, 'unit_created', null,
      { id, code, name, unitType, parentUnitId: parentId, status: 'active' }, reason)
  })
  return listOrganizationUnits().find(unit => unit.id === id)
}

export function createWorkforcePost(input, identity) {
  const postCode = requiredText(input.postCode, 'Post code', 60).toUpperCase()
  const positionId = requiredText(input.positionId, 'Position ID', 120)
  const organizationUnitId = requiredText(input.organizationUnitId, 'Organisation unit ID', 120)
  const reportsToPostId = input.reportsToPostId ?? null
  const reason = typeof input.reason === 'string' ? input.reason.trim().slice(0, 1000) : ''
  const actor = actorId(identity)
  const db = getDatabase()
  const id = randomUUID()
  const now = new Date().toISOString()

  transaction(db, () => {
    const position = db.prepare('SELECT status FROM workforce_positions WHERE id = ?').get(positionId)
    if (!position) throw new Error('Workforce position not found.')
    if (position.status !== 'approved') throw new TypeError('Only approved workforce positions can have authorised posts.')
    const unit = db.prepare('SELECT status FROM organization_units WHERE id = ?').get(organizationUnitId)
    if (!unit) throw new Error('Organisation unit not found.')
    if (unit.status !== 'active') throw new TypeError('The organisation unit must be active.')
    if (reportsToPostId) {
      const parent = db.prepare('SELECT status FROM workforce_posts WHERE id = ?').get(reportsToPostId)
      if (!parent) throw new Error('Reporting post not found.')
      if (parent.status === 'retired') throw new TypeError('A retired post cannot be a reporting line.')
    }
    db.prepare(`
      INSERT INTO workforce_posts
      (id, post_code, position_id, organization_unit_id, status,
       reports_to_post_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'vacant', ?, ?, ?)
    `).run(id, postCode, positionId, organizationUnitId, reportsToPostId, now, now)
    recordEvent(db, 'post', id, actor, 'post_created', null,
      { id, postCode, positionId, organizationUnitId, status: 'vacant', reportsToPostId }, reason)
  })
  return listWorkforcePosts().find(post => post.id === id)
}

export function createWorkforceAppointment(input, identity) {
  const employeeType = input.employeeType
  if (!['human', 'ai_employee'].includes(employeeType)) {
    throw new TypeError('Employee type must be human or ai_employee.')
  }
  const employeeId = requiredText(input.employeeId, 'Employee ID', 120)
  const postId = requiredText(input.postId, 'Post ID', 120)
  const appointmentType = input.appointmentType ?? 'primary'
  if (!appointmentTypes.includes(appointmentType)) throw new TypeError('Invalid appointment type.')
  const startAt = input.startAt ?? new Date().toISOString()
  if (typeof startAt !== 'string' || !Number.isFinite(Date.parse(startAt))) {
    throw new TypeError('Appointment start date must be valid.')
  }
  const reason = typeof input.reason === 'string' ? input.reason.trim().slice(0, 1000) : ''
  const actor = actorId(identity)
  const db = getDatabase()
  const id = randomUUID()
  const now = new Date().toISOString()

  transaction(db, () => {
    const employee = employeeType === 'human'
      ? db.prepare('SELECT status FROM users WHERE id = ?').get(employeeId)
      : db.prepare('SELECT status FROM ai_employees WHERE id = ?').get(employeeId)
    if (!employee) throw new Error('Employee identity not found.')
    if (employeeType === 'human' && employee.status !== 'active') {
      throw new TypeError('Only active human users can receive appointments.')
    }
    if (employeeType === 'ai_employee' && employee.status === 'suspended') {
      throw new TypeError('A suspended AI employee cannot receive an appointment.')
    }

    const post = db.prepare(`
      SELECT p.status, wp.status AS positionStatus, u.status AS unitStatus
      FROM workforce_posts p
      JOIN workforce_positions wp ON wp.id = p.position_id
      JOIN organization_units u ON u.id = p.organization_unit_id
      WHERE p.id = ?
    `).get(postId)
    if (!post) throw new Error('Workforce post not found.')
    if (post.status !== 'vacant') throw new TypeError('The post is not vacant.')
    if (post.positionStatus !== 'approved') throw new TypeError('The workforce position is not approved.')
    if (post.unitStatus !== 'active') throw new TypeError('The organisation unit is not active.')

    db.prepare(`
      INSERT INTO workforce_appointments
      (id, employee_type, employee_id, post_id, appointment_type, status,
       start_at, end_at, appointed_by, reason, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?, NULL, ?, ?, ?, ?)
    `).run(id, employeeType, employeeId, postId, appointmentType, startAt, actor, reason, now, now)

    db.prepare(`
      UPDATE workforce_posts SET status = 'occupied', updated_at = ? WHERE id = ?
    `).run(now, postId)

    recordEvent(db, 'appointment', id, actor, 'appointment_created', null,
      { id, employeeType, employeeId, postId, appointmentType, status: 'active', startAt }, reason)
    recordEvent(db, 'post', postId, actor, 'post_occupied', { status: 'vacant' },
      { status: 'occupied', appointmentId: id }, reason)
  })
  return listWorkforceAppointments().find(appointment => appointment.id === id)
}
