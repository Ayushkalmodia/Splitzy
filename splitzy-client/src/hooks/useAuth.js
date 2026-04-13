import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../lib/api.js'

const readAuthFromStorage = () => {
  const token = localStorage.getItem('token')
  const storedUser = localStorage.getItem('user')

  if (!token || !storedUser) {
    return {
      user: null,
      isAuthenticated: false,
      loading: false
    }
  }

  try {
    return {
      user: JSON.parse(storedUser),
      isAuthenticated: true,
      loading: false
    }
  } catch (error) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')

    return {
      user: null,
      isAuthenticated: false,
      loading: false
    }
  }
}

// IMPORTANT FIX: initialize from storage immediately
let authStore = readAuthFromStorage()

const listeners = new Set()

const emitAuthChange = () => {
  listeners.forEach((listener) => listener(authStore))
}

const setAuthStore = (nextState) => {
  authStore = nextState
  emitAuthChange()
}

export const useAuth = () => {
  const [state, setState] = useState(authStore)
  const navigate = useNavigate()

  const forceAuthCheck = useCallback(() => {
    setAuthStore(readAuthFromStorage())
  }, [])

  const updateUser = useCallback((userData) => {
    localStorage.setItem('user', JSON.stringify(userData))

    // IMPORTANT FIX: directly authenticate
    setAuthStore({
      user: userData,
      isAuthenticated: true,
      loading: false
    })
  }, [])

  useEffect(() => {
    const handleAuthChange = (nextState) => {
      setState(nextState)
    }

    listeners.add(handleAuthChange)

    // sync current state on mount
    forceAuthCheck()

    const onStorageChange = (event) => {
      if (
        event.key === 'token' ||
        event.key === 'user' ||
        event.key === null
      ) {
        forceAuthCheck()
      }
    }

    window.addEventListener('storage', onStorageChange)

    return () => {
      listeners.delete(handleAuthChange)
      window.removeEventListener('storage', onStorageChange)
    }
  }, [forceAuthCheck])

  const logout = () => {
    void apiClient.post('/auth/logout', {}, { withCredentials: true }).catch(() => {})

    localStorage.removeItem('token')
    localStorage.removeItem('user')

    setAuthStore({
      user: null,
      isAuthenticated: false,
      loading: false
    })

    navigate('/login', { replace: true })
  }

  return {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    forceAuthCheck,
    updateUser,
    logout
  }
}