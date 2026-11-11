import { sendJson } from '../services/http-response.js'

const WINDOW_MS = 60_000
const MAX_REQUESTS = 60
const clients = new Map()

export function applyRateLimit(req, res) {
  const address = req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  let client = clients.get(address)

  if (!client || now - client.start >= WINDOW_MS) {
    client = { start: now, count: 0 }
    clients.set(address, client)
  }

  client.count += 1

  if (client.count > MAX_REQUESTS) {
    sendJson(res, 429, { error: 'Too many requests. Try again shortly.' })
    return false
  }

  return true
}

export function cleanupExpiredClients() {
  const now = Date.now()

  for (const [address, client] of clients) {
    if (now - client.start >= WINDOW_MS) clients.delete(address)
  }
}
