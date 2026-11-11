import { useEffect, useState, type FormEvent } from 'react'
import type { AuthenticatedUser } from './types'
import App from '../App'
import './AuthGate.css'

type GateStatus = 'checking' | 'unauthenticated' | 'authenticated' | 'error'

async function readSession(): Promise<AuthenticatedUser | null> {
  const response = await fetch('/api/auth/session', {
    method: 'GET',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })

  if (response.status === 401) return null
  if (!response.ok) throw new Error('Unable to verify your session.')

  const data = await response.json() as {
    authenticated?: boolean
    user?: AuthenticatedUser
  }

  return data.authenticated && data.user ? data.user : null
}

export default function AuthGate() {
  const [status, setStatus] = useState<GateStatus>('checking')
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function restoreSession() {
    setStatus('checking')
    setError('')

    try {
      const currentUser = await readSession()
      setUser(currentUser)
      setStatus(currentUser ? 'authenticated' : 'unauthenticated')
    } catch {
      setUser(null)
      setStatus('error')
      setError('The HQ authentication service could not be reached. Check that the local API server is running.')
    }
  }

  useEffect(() => {
    let active = true

    readSession()
      .then(currentUser => {
        if (!active) return
        setUser(currentUser)
        setStatus(currentUser ? 'authenticated' : 'unauthenticated')
      })
      .catch(() => {
        if (!active) return
        setStatus('error')
        setError('The HQ authentication service could not be reached. Check that the local API server is running.')
      })

    return () => {
      active = false
    }
  }, [])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json().catch(() => ({})) as {
        success?: boolean
        error?: string
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Login failed. Check your email and password.')
      }

      const currentUser = await readSession()
      if (!currentUser) {
        throw new Error('Login was accepted, but the session could not be verified. Please try again.')
      }

      setUser(currentUser)
      setPassword('')
      setStatus('authenticated')
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'An unexpected login error occurred.')
    } finally {
      setBusy(false)
    }
  }

  async function handleLogout() {
    setBusy(true)
    setError('')

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        throw new Error('The server could not confirm logout. Your session has not been cleared from this interface.')
      }

      setUser(null)
      setPassword('')
      setStatus('unauthenticated')
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'Logout failed.')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'checking') {
    return <main className="auth-screen"><section className="auth-card"><div className="auth-brand">DREYPELLA <span>HQ</span></div><p>Verifying your secure session...</p></section></main>
  }

  if (status === 'error') {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <div className="auth-brand">DREYPELLA <span>HQ</span></div>
          <h1>Connection unavailable</h1>
          <p>{error}</p>
          <button className="auth-submit" onClick={restoreSession}>Retry connection</button>
        </section>
      </main>
    )
  }

  if (status === 'authenticated' && user) {
    if (!user.roles.includes('Group CEO')) {
      return (
        <main className="auth-screen">
          <section className="auth-card">
            <div className="auth-brand">DREYPELLA <span>HQ</span></div>
            <h1>Access not authorised</h1>
            <p>This account is authenticated, but it does not have the Group CEO role required for this headquarters workspace.</p>
            <p className="auth-identity">{user.displayName} · {user.email}</p>
            <button className="auth-submit" onClick={handleLogout} disabled={busy}>Sign out</button>
            {error && <p className="auth-error">{error}</p>}
          </section>
        </main>
      )
    }

    if (user.mustChangePassword) {
      return (
        <main className="auth-screen">
          <section className="auth-card">
            <div className="auth-brand">DREYPELLA <span>HQ</span></div>
            <h1>Password change required</h1>
            <p>This account must change its password before accessing HQ. The password-change workflow has not yet been implemented. Please contact the authorised system administrator.</p>
            <button className="auth-submit" onClick={handleLogout} disabled={busy}>Sign out</button>
          </section>
        </main>
      )
    }

    return <App user={user} onLogout={handleLogout} />
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-brand">DREYPELLA <span>HQ</span></div>
        <div className="auth-kicker">GROUP HEADQUARTERS</div>
        <h1>Welcome back</h1>
        <p className="auth-intro">Sign in with your authorised Dreypella HQ account.</p>
        <form onSubmit={handleLogin}>
          <label htmlFor="hq-email">Email address</label>
          <input id="hq-email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} />
          <label htmlFor="hq-password">Password</label>
          <input id="hq-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required maxLength={256} />
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in securely'}
          </button>
        </form>
        <p className="auth-footnote">Authorised access only · Dreypella Group</p>
      </section>
    </main>
  )
}
