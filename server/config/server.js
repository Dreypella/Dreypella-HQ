const configuredPort = Number(process.env.PORT || 8787)

if (!Number.isInteger(configuredPort) || configuredPort < 1 || configuredPort > 65535) {
  throw new Error('PORT must be a valid integer between 1 and 65535.')
}

export const HOST = '127.0.0.1'
export const PORT = configuredPort
