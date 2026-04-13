import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import OAuthCallback from './OAuthCallback.jsx'

const updateUser = vi.fn()
const forceAuthCheck = vi.fn()

vi.mock('../hooks/useAuth.js', () => ({
  useAuth: () => ({
    updateUser,
    forceAuthCheck
  })
}))

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

function fakeJwtPayload(payload) {
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `h.${body}.s`
}

describe('OAuthCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('stores JWT, updates auth context, and navigates to dashboard', async () => {
    const token = fakeJwtPayload({
      id: 'u-oauth',
      email: 'dash@example.com',
      name: 'Dash',
      role: 'member',
      authTypes: ['google']
    })
    const hash = `access_token=${encodeURIComponent(token)}&provider=google`
    window.history.replaceState(null, '', `/oauth/callback#${hash}`)

    render(
      <MemoryRouter initialEntries={['/oauth/callback']}>
        <Routes>
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/dashboard" element={<div data-testid="dashboard">in</div>} />
          <Route path="/login" element={<div data-testid="login">login</div>} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe(token)
      expect(JSON.parse(localStorage.getItem('user')).email).toBe('dash@example.com')
      expect(updateUser).toHaveBeenCalled()
      expect(forceAuthCheck).toHaveBeenCalled()
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })
  })
})
