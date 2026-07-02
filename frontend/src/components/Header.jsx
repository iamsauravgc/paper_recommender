import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../useAuth.js"
import { hasConfig } from "../firebase.js"

export default function Header() {
  const { user, login, logout, authError, clearError } = useAuth()
  const location = useLocation()
  const [darkMode, setDarkMode] = useState(() =>
    document.documentElement.classList.contains("dark")
  )

  function toggleDark() {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("darkMode", next)
  }

  function navLink(path, label) {
    const active = location.pathname === path
    return (
      <Link
        to={path}
        className={`text-sm transition-colors ${active ? "text-gray-900 dark:text-white font-semibold" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
      >
        {label}
      </Link>
    )
  }

  async function handleLogin() {
    clearError()
    await login()
  }

  return (
    <div className="mb-8">
      <div className="flex items-start justify-between">
        <div>
          <Link to="/">
            <h1 className="text-2xl font-bold tracking-tight dark:text-white">Paper Recommender</h1>
          </Link>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Find similar research papers</p>
        </div>
        <div className="flex items-center gap-3">
          {hasConfig && (
            user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">{user.email}</span>
                <button onClick={logout} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 px-3 py-1 rounded-lg transition-colors">
                  Logout
                </button>
              </div>
            ) : (
              <button onClick={handleLogin} className="text-xs text-gray-900 dark:text-gray-300 font-medium border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                Sign in
              </button>
            )
          )}
          <button
            onClick={toggleDark}
            className="shrink-0 p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {authError && (
        <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg px-4 py-3 text-xs">
          {authError}
        </div>
      )}

      <nav className="flex gap-5 mt-6 border-b border-gray-100 dark:border-gray-800 pb-3">
        {navLink("/", "Recommend")}
        {navLink("/browse", "Browse")}
        {navLink("/saved", "Saved")}
      </nav>
    </div>
  )
}
