import { test, expect } from '@playwright/test'

test.describe('Marketing home', () => {
  test('hero heading is visible', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /split expenses/i })).toBeVisible()
  })

  test('login link navigates', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /sign in|log in|login/i }).first().click()
    await expect(page).toHaveURL(/login/)
  })
})
