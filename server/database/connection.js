import { chmod, mkdir } from 'node:fs/promises'
import { readFileSync, readdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const dataDirectory = process.env.DREYPELLA_DATA_DIR ||
  path.join(os.homedir(), '.local', 'share', 'dreypella-hq')

const databasePath = path.join(dataDirectory, 'dreypella-hq.sqlite')
const schemaPath = new URL('./schema.sql', import.meta.url)
const migrationsDirectory = fileURLToPath(new URL('./migrations/', import.meta.url))

function runMigrations(connection) {
  connection.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`)

  const files = readdirSync(migrationsDirectory)
    .filter(name => /^\d+_[a-z0-9_-]+\.sql$/.test(name))
    .sort()

  for (const filename of files) {
    const exists = connection.prepare(
      'SELECT filename FROM schema_migrations WHERE filename = ?'
    ).get(filename)
    if (exists) continue

    const migration = readFileSync(path.join(migrationsDirectory, filename), 'utf8')
    connection.exec('BEGIN IMMEDIATE')
    try {
      connection.exec(migration)
      connection.prepare(
        'INSERT INTO schema_migrations (filename, applied_at) VALUES (?, ?)'
      ).run(filename, new Date().toISOString())
      connection.exec('COMMIT')
      console.log(`Applied database migration: ${filename}`)
    } catch (error) {
      connection.exec('ROLLBACK')
      throw error
    }
  }
}

let database

export async function initializeDatabase() {
  if (database) return database

  await mkdir(dataDirectory, { recursive: true, mode: 0o700 })
  await chmod(dataDirectory, 0o700)

  const connection = new DatabaseSync(databasePath)

  try {
    connection.exec('PRAGMA foreign_keys = ON')
    connection.exec('PRAGMA busy_timeout = 5000')
    connection.exec('PRAGMA journal_mode = WAL')
    connection.exec('PRAGMA synchronous = FULL')

    const schema = readFileSync(schemaPath, 'utf8')
    connection.exec(schema)
    runMigrations(connection)

    await chmod(databasePath, 0o600)

    database = connection
    console.log('Dreypella HQ task database initialized.')
    return database
  } catch (error) {
    connection.close()
    throw error
  }
}

export function getDatabase() {
  if (!database) {
    throw new Error('Database has not been initialized.')
  }

  return database
}
