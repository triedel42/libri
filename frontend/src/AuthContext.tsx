import { createContext, useEffect, useState, type ReactNode } from 'react'

export interface User {
  sub: string
  login: string
  displayname: string
}

export interface AuthCtx {
  user: User | null
  loading: boolean
  logout: () => Promise<void>
}

// eslint-disable-next-line react-refresh/only-export-components
export const Ctx = createContext<AuthCtx>({ user: null, loading: true, logout: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then(setUser)
      .finally(() => setLoading(false))
  }, [])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  return <Ctx.Provider value={{ user, loading, logout }}>{children}</Ctx.Provider>
}
