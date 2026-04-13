import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth.js'
import { resolveOAuthFragment } from '../lib/oauthParse.js'

export default function OAuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { updateUser, forceAuthCheck } = useAuth()
  const [message, setMessage] = useState('Completing sign-in…')

  useEffect(() => {
    const err = searchParams.get('error')
    if (err) {
      setMessage('Sign-in failed')
      toast.error(err === 'oauth_denied' ? 'Sign-in was cancelled' : 'Sign-in failed')
      navigate('/login', { replace: true })
      return
    }

    const resolved = resolveOAuthFragment(window.location.hash)
    if (!resolved.ok) {
      setMessage('Invalid response')
      toast.error(resolved.error === 'missing_token' ? 'Invalid OAuth response' : 'Invalid session token')
      navigate('/login', { replace: true })
      return
    }

    const { access_token, user, provider } = resolved

    localStorage.setItem('token', access_token)
    localStorage.setItem('user', JSON.stringify(user))
    updateUser(user)
    forceAuthCheck()

    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)

    toast.success(provider === 'apple' ? 'Signed in with Apple' : 'Signed in with Google')
    navigate('/dashboard', { replace: true })
  }, [navigate, searchParams, updateUser, forceAuthCheck])

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="text-center text-neutral-600">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mx-auto mb-4" />
        <p>{message}</p>
      </div>
    </div>
  )
}
