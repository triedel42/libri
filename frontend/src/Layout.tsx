import { Link, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'

const bookSvg = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
)

const barcodeSvg = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <rect x="2"  y="3" width="1" height="18" />
    <rect x="4"  y="3" width="2" height="18" />
    <rect x="7"  y="3" width="1" height="18" />
    <rect x="9"  y="3" width="3" height="18" />
    <rect x="13" y="3" width="1" height="18" />
    <rect x="15" y="3" width="2" height="18" />
    <rect x="18" y="3" width="1" height="18" />
    <rect x="20" y="3" width="2" height="18" />
  </svg>
)

export default function Layout() {
  const { user, loading, logout } = useAuth()

  if (loading) return null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b py-4">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-3 items-center">
          <Link to="/" className="inline-flex items-center gap-2 border-b-2 border-transparent hover:border-current transition-colors justify-self-start">
            {bookSvg}
            <span className="text-2xl font-bold tracking-tight">Books</span>
          </Link>
          {user && (
            <Link to="/scan" className="justify-self-center p-2 rounded-lg border border-current transition-colors">
              {barcodeSvg}
            </Link>
          )}
          {user && (
            <button onClick={logout} className="cursor-pointer border-b-2 border-transparent hover:border-current transition-colors justify-self-end">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {user ? (
        <Outlet />
      ) : (
        <main className="flex items-center justify-center flex-1">
          <div className="relative flex justify-center">
            <img src="/42wolfsburg.svg" alt="42 Wolfsburg" className="absolute bottom-full mb-6 w-36" />
            <a
              href="/api/auth/login"
              className="px-10 py-3 bg-gray-900 hover:bg-gray-700 text-white font-medium rounded-full"
            >
              Login with 42
            </a>
          </div>
        </main>
      )}
    </div>
  )
}
