import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('overview loads committed CSV totals and the wage chart gives an exact value on focus', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Payroll at a glance' })).toBeVisible()
  await expect(page.getByText('263 records')).toBeVisible()
  await expect(page.locator('.stats').getByText('$429,215')).toBeVisible()
  await expect(page.locator('.stats').getByText('9,956.8')).toBeVisible()
  await expect(page.locator('.stats').getByText('23')).toBeVisible()

  const chart = page.getByRole('group', { name: 'Weekly cash wage spend' })
  await chart.getByRole('group', { name: /Week ending 03\/01\/2025: cash wages/ }).focus()
  await expect(chart.locator('.chart-tooltip')).toContainText('Week ending 03/01/2025')
  await expect(chart.locator('.chart-tooltip')).toContainText('cash wages:')
})

test('global filters combine and Clear filters restores all records', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Level', exact: true }).selectOption('APPRENTICE')
  await page.getByRole('combobox', { name: 'Occupation' }).selectOption('Mason')
  await page.getByRole('combobox', { name: 'Week ending' }).selectOption('03/01/2025')
  await expect(page.getByText('1 records')).toBeVisible()
  await expect(page.locator('.stats').getByText('1', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page.getByText('263 records')).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Level', exact: true })).toHaveValue('all')
  await expect(page.getByRole('combobox', { name: 'Occupation' })).toHaveValue('all')
  await expect(page.getByRole('combobox', { name: 'Week ending' })).toHaveValue('all')
})

test('employee search and selection show weekly comparison', async ({ page }) => {
  await page.getByRole('button', { name: 'Employees', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Search employees' }).fill('Ernestine Gerlach')
  await expect(page.getByRole('heading', { name: '1 employees' })).toBeVisible()
  await page.getByRole('button', { name: /Ernestine Gerlach/ }).click()
  await expect(page.getByRole('heading', { name: 'Ernestine Gerlach' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Change from previous reported week' })).toBeVisible()
  await expect(page.getByText(/compared with the previous reported week/)).toBeVisible()
  await expect(page.getByRole('row', { name: /Cash wages/ }).first()).toBeVisible()
})

test('review category and week filter narrow the queue', async ({ page }) => {
  await page.getByRole('button', { name: 'Review queue' }).click()
  await expect(page.getByRole('heading', { name: 'Needs review' })).toBeVisible()
  const cards = page.locator('article.flag-card')
  const allCount = await cards.count()
  await page.getByRole('button', { name: 'hours', exact: true }).click()
  await expect(page.getByRole('button', { name: 'hours', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(cards.first()).toBeVisible()
  await expect(cards.first().locator('.flag-category')).toHaveText('hours')
  expect(await cards.count()).toBeLessThan(allCount)

  await page.getByRole('combobox', { name: 'Week ending' }).selectOption('03/01/2025')
  await expect(cards.first()).toBeVisible()
  await expect(cards.filter({ hasNotText: 'week ending Mar 1' })).toHaveCount(0)
})
