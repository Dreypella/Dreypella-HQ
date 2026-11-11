import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual
} from 'node:crypto'

const SCRYPT_OPTIONS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024
}

export function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) {
    throw new Error('Password must contain between 12 and 256 characters.')
  }

  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64, SCRYPT_OPTIONS)

  return {
    hash: hash.toString('hex'),
    salt: salt.toString('hex'),
    algorithm: 'scrypt'
  }
}

export function verifyPassword(password, user) {
  if (
    typeof password !== 'string' ||
    !user ||
    user.password_algorithm !== 'scrypt' ||
    !/^[a-f0-9]{32}$/i.test(user.password_salt) ||
    !/^[a-f0-9]{128}$/i.test(user.password_hash)
  ) {
    return false
  }

  const expected = Buffer.from(user.password_hash, 'hex')
  const actual = scryptSync(
    password,
    Buffer.from(user.password_salt, 'hex'),
    64,
    SCRYPT_OPTIONS
  )

  return timingSafeEqual(expected, actual)
}

export function createOpaqueToken() {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token) {
  if (typeof token !== 'string' || token.length < 32) {
    throw new Error('Invalid token.')
  }

  return createHash('sha256').update(token).digest('hex')
}

export function createIdentityId() {
  return randomUUID()
}
