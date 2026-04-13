import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import SocialAuthButtons from './SocialAuthButtons.jsx'

vi.mock('../services/authService.js', () => ({
  authService: {
    getOAuthStatus: vi.fn()
  }
}))

import { authService } from '../services/authService.js'

describe('SocialAuthButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders enabled Google and Apple when backend reports both enabled', async () => {
    authService.getOAuthStatus.mockResolvedValue({ google: true, apple: true })
    render(<SocialAuthButtons />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeEnabled()
      expect(screen.getByRole('button', { name: /continue with apple/i })).toBeEnabled()
    })
  })

  it('disables Google and shows setup hint when not configured', async () => {
    authService.getOAuthStatus.mockResolvedValue({ google: false, apple: false })
    render(<SocialAuthButtons />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeDisabled()
    })
    expect(screen.getByText(/GOOGLE_CLIENT_ID/i)).toBeInTheDocument()
  })
})
