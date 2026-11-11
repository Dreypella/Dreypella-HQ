import http from 'node:http'
import { HOST, PORT } from './config/server.js'
import { initializeDatabase } from './database/connection.js'
import { applyRateLimit, cleanupExpiredClients } from './middleware/security.js'
import { handleApiRequest } from './routes/api.js'

await initializeDatabase()

const server = http.createServer(async (req, res) => {
  if (!applyRateLimit(req, res)) return

  const url = new URL(req.url || '/', 'http://localhost')

  try {
    await handleApiRequest(req, res, url)
  } catch (error) {
    console.error('API request failed:', error)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify({ error: 'Internal server error.' }))
    }
  }
})

server.listen(PORT, HOST, () => {
  console.log(`Dreypella HQ API listening on http://${HOST}:${PORT}`)
  console.log('Local development only. Authentication endpoints are available.')
})

const cleanup = setInterval(cleanupExpiredClients, 60_000)
cleanup.unref()

function shutdown() {
  clearInterval(cleanup)
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
