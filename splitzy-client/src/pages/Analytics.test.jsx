import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Analytics from './Analytics.jsx'

vi.mock('../services/expenseService', () => ({
  expenseService: {
    getExpenses: vi.fn()
  }
}))

import { expenseService } from '../services/expenseService'

describe('Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no expenses in range', async () => {
    expenseService.getExpenses.mockResolvedValue({ items: [] })
    render(<Analytics />)
    await waitFor(() => {
      expect(screen.getByText(/no expenses in this range/i)).toBeInTheDocument()
    })
  })

  it('shows error banner when fetch fails', async () => {
    expenseService.getExpenses.mockRejectedValue(new Error('network'))
    render(<Analytics />)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/couldn.*t load your expenses/i)).toBeInTheDocument()
  })
})
