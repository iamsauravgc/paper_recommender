import { useState, useCallback } from "react"
import { AuthContext } from "./AuthContext.js"
import { auth, provider, hasConfig, signInWithPopup, signOut } from "./firebase.js"
import api from "./api.js"

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem("firebaseUser")
    return stored ? JSON.parse(stored) : null
  })
  const [authError, setAuthError] = useState(null)

  const login = useCallback(async () => {
    if (!hasConfig || !auth) return
    setAuthError(null)
    try {
      const result = await signInWithPopup(auth, provider)
      const token = await result.user.getIdToken()

      const res = await api.post("/auth/login", { token })
      const userData = res.data

      sessionStorage.setItem("firebaseToken", token)
      sessionStorage.setItem("firebaseUser", JSON.stringify(userData))
      setUser(userData)
    } catch (err) {
      const msg = err.code === "auth/popup-blocked"
        ? "Popup was blocked by your browser. Allow popups for this site."
        : err.code === "auth/unauthorized-domain"
        ? "This domain is not authorized in Firebase Console. Add localhost to Authentication → Settings → Authorized domains."
        : err.code === "auth/operation-not-allowed"
        ? "Google sign-in is not enabled in Firebase Console. Enable it in Authentication → Sign-in method."
        : err.message || "Sign in failed."
      setAuthError(msg)
    }
  }, [])

  const logout = useCallback(async () => {
    if (auth) await signOut(auth)
    sessionStorage.removeItem("firebaseToken")
    sessionStorage.removeItem("firebaseUser")
    setUser(null)
    setAuthError(null)
  }, [])

  function clearError() {
    setAuthError(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading: false, login, logout, authError, clearError }}>
      {children}
    </AuthContext.Provider>
  )
}
