import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import AdvancedExpenseForm from '../AdvancedExpenseForm.jsx'

const categorizeMock = vi.fn()

vi.mock('../../services/analyticsService.js', () => ({
  analyticsService: {
    categorizeExpense: (...args) => categorizeMock(...args)
  }
}))

vi.mock('../../services/groupService.js', () => ({
  groupService: {
    getGroups: vi.fn().mockResolvedValue([
      {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test Group',
        members: [
          {
            _id: '507f1f77bcf86cd799439012',
            email: 'user@test.com',
            name: 'Test User'
          }
        ]
      }
    ])
  }
}))

vi.mock('../../services/authService.js', () => ({
  authService: {
    getCurrentUser: () => ({
      id: '507f1f77bcf86cd799439012',
      email: 'user@test.com',
      name: 'Test User'
    })
  }
}))

const GROUP_ID = '507f1f77bcf86cd799439011'

function renderOpenForm() {
  return render(
    <BrowserRouter>
      <AdvancedExpenseForm
        isOpen
        onClose={() => {}}
        groupId={GROUP_ID}
        onExpenseCreated={() => {}}
      />
    </BrowserRouter>
  )
}

describe('AdvancedExpenseForm smart categorization', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    categorizeMock.mockReset()
    categorizeMock.mockResolvedValue({
      predictedCategory: 'Food',
      categoryConfidence: 0.94
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces description changes and calls categorize once after idle', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderOpenForm()

    const descInput = await screen.findByPlaceholderText(/What was this expense for/i)
    await user.type(descInput, 'pizza')

    expect(categorizeMock).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    await waitFor(() => {
      expect(categorizeMock).toHaveBeenCalledTimes(1)
    })
    expect(categorizeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'pizza'
      })
    )
  })

  it('does not call API excessively when typing continues (debounce reset)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderOpenForm()

    const descInput = await screen.findByPlaceholderText(/What was this expense for/i)
    await user.type(descInput, 'ab')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    await user.type(descInput, 'c')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    await user.type(descInput, 'def')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    await waitFor(() => {
      expect(categorizeMock.mock.calls.length).toBeGreaterThanOrEqual(1)
    })
    expect(categorizeMock.mock.calls.length).toBeLessThanOrEqual(2)
  })

  it('shows suggested category and confidence after success', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderOpenForm()

    const descInput = await screen.findByPlaceholderText(/What was this expense for/i)
    await user.type(descInput, 'pizza party')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    await waitFor(() => {
      expect(screen.getByText(/Suggested:/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/94%/)).toBeInTheDocument()
  })

  it('manual category selection does not auto-sync from AI (badge shows manual)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderOpenForm()

    const selects = await screen.findAllByRole('combobox')
    const catSelect = selects[0]

    await user.selectOptions(catSelect, 'utilities')

    const descInput = await screen.findByPlaceholderText(/What was this expense for/i)
    await user.type(descInput, 'pizza')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    await waitFor(() => expect(categorizeMock).toHaveBeenCalled())
    expect(catSelect).toHaveValue('utilities')
    expect(screen.getByText('Manual')).toBeInTheDocument()
  })
})
