import './index.css'
import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import ProblemSpace from './pages/ProblemSpace'
import { supabase, getSession, onAuthStateChange } from './util/supabase'

function LandingPage({ onShowLogin }: { onShowLogin: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center max-w-2xl mx-auto px-6">
        <h1 className="text-5xl font-bold text-gray-800 mb-6">Welcome to Our App</h1>
        <p className="text-xl text-gray-600 mb-8">
          Get started by signing in to access your personalized experience.
        </p>
        <button 
          onClick={onShowLogin} 
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-colors shadow-lg hover:shadow-xl"
        >
          Get Started
        </button>
      </div>
    </div>
  )
}

function LoginPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Login</h1>
          <button 
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700 text-lg"
          >
            ✕
          </button>
        </div>
        <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} />
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    getSession().then(({ session }) => {
      setSession(session)
    })

    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id)
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            session ? (
              <Navigate to="/home" replace />
            ) : showLogin ? (
              <LoginPage onBack={() => setShowLogin(false)} />
            ) : (
              <LandingPage onShowLogin={() => setShowLogin(true)} />
            )
          } 
        />
        <Route 
          path="/home" 
          element={
            session ? (
              <Home session={session} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/problem-space/:sessionId" 
          element={
            session ? (
              <ProblemSpace />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
      </Routes>
    </Router>
  )
}