import { getDatabase } from '../database/connection.js'

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function listDepartments() {
  return getDatabase().prepare(`
    SELECT
      d.id,
      d.code,
      d.name,
      d.description,
      d.department_type AS departmentType,
      d.status,
      d.created_at AS createdAt,
      d.updated_at AS updatedAt,
      COUNT(wp.id) AS positionCount
    FROM departments d
    LEFT JOIN workforce_positions wp ON wp.department_id = d.id
    GROUP BY d.id
    ORDER BY d.name COLLATE NOCASE
  `).all()
}

export function listWorkforcePositions() {
  const rows = getDatabase().prepare(`
    SELECT
      wp.id,
      wp.position_code AS positionCode,
      wp.name,
      wp.title,
      wp.department_id AS departmentId,
      d.name AS departmentName,
      wp.supervisor_title AS supervisorTitle,
      wp.division_scope AS divisionScope,
      wp.authority,
      wp.responsibilities_json AS responsibilitiesJson,
      wp.capabilities_json AS capabilitiesJson,
      wp.approval_boundaries_json AS approvalBoundariesJson,
      wp.status,
      wp.sort_order AS sortOrder,
      wp.created_at AS createdAt,
      wp.updated_at AS updatedAt
    FROM workforce_positions wp
    JOIN departments d ON d.id = wp.department_id
    ORDER BY wp.sort_order, wp.name COLLATE NOCASE
  `).all()

  return rows.map(row => ({
    id: row.id,
    positionCode: row.positionCode,
    name: row.name,
    title: row.title,
    departmentId: row.departmentId,
    departmentName: row.departmentName,
    supervisorTitle: row.supervisorTitle,
    divisionScope: row.divisionScope,
    authority: row.authority,
    responsibilities: parseJsonArray(row.responsibilitiesJson),
    capabilities: parseJsonArray(row.capabilitiesJson),
    approvalBoundaries: parseJsonArray(row.approvalBoundariesJson),
    status: row.status,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }))
}
