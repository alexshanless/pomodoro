import React, { createContext, useState, useEffect, useContext } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

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
  const updatePassword = async (newPassword) => {
    if (!supabase) {
      return { data: null, error: new Error('Supabase is not configured') }
    }
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    return { data, error }
  }

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
    </AuthContext.Provider>
  )
}

export default AuthContext
