import React, { createContext, useState, useEffect, useContext } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useSessionTimeout } from '../hooks/useSessionTimeout'
import SessionTimeoutWarning from '../components/SessionTimeoutWarning'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false)

  useEffect(() => {
    // If Supabase is not configured, just set loading to false
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Sign up with email and password
  const signUp = async (email, password) => {
    if (!supabase) {
      return { data: null, error: new Error('Supabase is not configured') }
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  }

  // Sign in with email and password
  const signIn = async (email, password) => {
    if (!supabase) {
      return { data: null, error: new Error('Supabase is not configured') }
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  // Sign out
  const signOut = async () => {
    if (!supabase) {
      return { error: new Error('Supabase is not configured') }
    }
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  // Reset password
  const resetPassword = async (email) => {
    if (!supabase) {
      return { data: null, error: new Error('Supabase is not configured') }
    }
    const { data, error } = await supabase.auth.resetPasswordForEmail(email)
    return { data, error }
  }

  // Update user profile
  const updateProfile = async (updates) => {
    if (!supabase) {
      return { data: null, error: new Error('Supabase is not configured') }
    }
    const { data, error } = await supabase.auth.updateUser(updates)
    return { data, error }
  }

  // Update password
  const updatePassword = async (currentPassword, newPassword) => {
    if (!supabase) {
      return { data: null, error: new Error('Supabase is not configured') }
    }

    // If current password is provided, verify it first
    if (currentPassword) {
      // Verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      })

      if (verifyError) {
        return { data: null, error: new Error('Current password is incorrect') }
      }
    }

    // Update to new password
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    return { data, error }
  }

  // Handle session timeout
  const handleTimeout = async () => {
    // Auto-save any active work before logout
    // (Timer component handles this via beforeunload and localStorage)

    // Sign out
    await signOut()

    // Clear warning
    setShowTimeoutWarning(false)
  }

  const handleWarning = () => {
    setShowTimeoutWarning(true)
  }

  const handleStayLoggedIn = () => {
    setShowTimeoutWarning(false)
    extendSession()
  }

  // Get session timeout settings from localStorage
  const getTimeoutSettings = () => {
    const saved = localStorage.getItem('sessionTimeoutSettings')
    if (saved) {
      const settings = JSON.parse(saved)
      return {
        enabled: settings.enabled === true, // Disabled by default for Pomodoro timer
        timeout: (settings.timeoutMinutes || 120) * 60 * 1000
      }
    }
    return { enabled: false, timeout: 120 * 60 * 1000 } // Default: DISABLED for uninterrupted focus
  }

  const timeoutSettings = getTimeoutSettings()

  // Session timeout hook - disabled by default for Pomodoro workflow
  // Users can enable in settings if needed for security reasons
  const { remainingTime, extendSession } = useSessionTimeout({
    timeout: timeoutSettings.timeout,
    warningTime: 2 * 60 * 1000, // 2 minutes warning
    onTimeout: handleTimeout,
    onWarning: handleWarning,
    enabled: !!user && isSupabaseConfigured && timeoutSettings.enabled // false by default
  })

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    updatePassword,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SessionTimeoutWarning
        isOpen={showTimeoutWarning}
        remainingTime={remainingTime}
        onStayLoggedIn={handleStayLoggedIn}
        onLogout={handleTimeout}
      />
    </AuthContext.Provider>
  )
}

export default AuthContext
