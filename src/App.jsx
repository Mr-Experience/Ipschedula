import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import SplashScreen from './components/SplashScreen'
import Login from './components/Login'
import Signup from './components/Signup'
import Verification from './components/Verification'
import Dashboard from './components/Dashboard'
import Friends from './components/Friends'
import './App.css'

function App() {
  const [appState, setAppState] = useState('splash')
  const [userEmail, setUserEmail] = useState('')
  const [session, setSession] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

  // 1. Listen for auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else if (appState === 'splash') setAppState('login')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchProfile(session.user.id)
      } else {
        setUserProfile(null)
        setAppState('login')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // 2. Fetch or Create Profile
  const fetchProfile = async (userId) => {
    if (userProfile && userProfile.id === userId) return; // Already loaded

    setProfileLoading(true)

    // Try to get profile
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    // If not found, try to create it (fallback if trigger failed)
    if (error || !data) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const newProfile = {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          nickname: user.user_metadata?.nickname || user.email?.split('@')[0] || 'user',
        }

        const { data: created, error: createError } = await supabase
          .from('profiles')
          .insert(fallback)
          .select()
          .single()

        if (!createError) data = created
        else data = newProfile // Use in-memory if even insert fails (RLS/unique issues)
      }
    }

    setUserProfile(data)
    setProfileLoading(false)

    // Move to dashboard if we were on an auth screen
    setAppState(prev => {
      if (['splash', 'login', 'signup', 'verification'].includes(prev)) {
        return 'dashboard'
      }
      return prev
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUserProfile(null)
    setAppState('login')
  }

  const handleNavigate = (page) => {
    setAppState(page)
  }

  // ── Screens ──

  if (appState === 'splash') {
    return <SplashScreen onComplete={() => setAppState('login')} />
  }

  if (!session) {
    if (appState === 'signup') {
      return (
        <Signup
          onGoToLogin={() => setAppState('login')}
          onSignupSuccess={(email) => {
            setUserEmail(email)
            setAppState('verification')
          }}
        />
      )
    }
    if (appState === 'verification') {
      return (
        <Verification
          email={userEmail}
          onVerificationSuccess={() => setAppState('login')}
        />
      )
    }
    return (
      <Login
        onGoToSignup={() => setAppState('signup')}
        onLoginSuccess={() => { /* Handled by onAuthStateChange */ }}
      />
    )
  }

  // Session exists but profile is still loading for the first time
  if (profileLoading && !userProfile) {
    return (
      <div className="app-loader">
        <div className="loader-spinner" />
        <p>Signing you in…</p>
      </div>
    )
  }

  if (appState === 'friends') {
    return (
      <Friends
        userProfile={userProfile}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
      />
    )
  }

  // Default: Dashboard
  return (
    <Dashboard
      userProfile={userProfile}
      onLogout={handleLogout}
      onNavigate={handleNavigate}
    />
  )
}

export default App
