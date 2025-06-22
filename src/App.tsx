import './index.css'
import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import ProblemSpace from './pages/ProblemSpace'
import ThreeJSLanding from './components/ThreeJSLanding'
import { supabase, getSession, onAuthStateChange } from './util/supabase'

function LoginPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-purple-900/10 to-indigo-900/10 animate-pulse"></div>
      
      <div className="relative z-10 bg-gray-900/50 backdrop-blur-sm p-8 rounded-lg shadow-2xl max-w-md w-full border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white font-karla">Login</h1>
          <button 
            onClick={onBack}
            className="text-gray-400 hover:text-white text-lg transition-colors"
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
              <ThreeJSLanding onShowLogin={() => setShowLogin(true)} />
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