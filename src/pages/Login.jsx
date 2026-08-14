import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, googleProvider, db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'

export default function Login() {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  async function handleGoogleSignIn() {
    setError('')
    setSigningIn(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const email = result.user.email
      const userDoc = await getDoc(doc(db, 'users', email))
      if (!userDoc.exists()) {
        await signOut(auth)
        setError('Access denied. Your account is not registered. Contact the administrator.')
      }
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Sign-in failed. Please try again.')
      }
    } finally {
      setSigningIn(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 to-blue-100">
      <Navbar />
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">CS-BYC Data Portal</h1>
            <p className="text-sm text-gray-500 mt-1">
              Department of Computer Science · CHRIST University BYC
            </p>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {user ? (
              <button
                onClick={() => navigate('/')}
                className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Go to Dashboard
              </button>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                disabled={signingIn}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {signingIn ? 'Signing in...' : 'Sign in with Google'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
