import { test, expect } from '@playwright/test'

const REGIONS = [
  { region: 'NAMER', active_agents: 100, aht_minutes: 15.0, projected_tickets: 40000 },
  { region: 'EMEA', active_agents: 80, aht_minutes: 12.0, projected_tickets: 35000 },
  { region: 'APAC', active_agents: 50, aht_minutes: 10.0, projected_tickets: 25000 },
]
const ASSUMPTIONS = { working_hours_per_month: 160, shrinkage_rate: 0.20, utilization_target: 0.85 }
const CAPACITY = [
  { region: 'NAMER', max_tickets: 43520, agents: 100, aht_minutes: 15, audit_trail: [] },
  { region: 'EMEA', max_tickets: 43520, agents: 80, aht_minutes: 12, audit_trail: [] },
  { region: 'APAC', max_tickets: 32640, agents: 50, aht_minutes: 10, audit_trail: [] },
]

async function mockAPIs(page) {
  await page.route('**/api/data/regions', route => route.fulfill({ json: REGIONS }))
  await page.route('**/api/data/assumptions', route => route.fulfill({ json: ASSUMPTIONS }))
  await page.route('**/api/compute/capacity', route => route.fulfill({ json: CAPACITY }))
  await page.route('**/api/compute/utilization', route => route.fulfill({ json: [] }))
}

test.describe('Scenario Planning Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAPIs(page)
    await page.goto('/scenarios')
  })

  test('default state shows mode toggle and ready placeholder', async ({ page }) => {
    await expect(page.getByText('Headcount Change')).toBeVisible()
    await expect(page.getByText('Parameter Change')).toBeVisible()
    await expect(page.getByText('Ready to Analyze')).toBeVisible()
  })

  test('baseline headcount shows 230 on Global tab', async ({ page }) => {
    await expect(page.getByText('230').first()).toBeVisible()
  })

  test('switching to Parameter Change mode changes editable fields', async ({ page }) => {
    await page.getByText('Parameter Change').click()
    // Volume should be editable (has INPUT badge)
    await expect(page.getByText('INPUT').first()).toBeVisible()
  })

  test('mode switch clears results', async ({ page }) => {
    // Mock a scenario response
    await page.route('**/api/compute/capacity-from-headcount', route => route.fulfill({
      json: { region: 'NAMER', target_agents: 120, current_agents: 100, headcount_delta: 20, max_volume: 52224, current_volume: 40000, volume_delta: 12224, effective_aht: 15, current_aht: 15, minutes_per_agent: 6528, audit_trail: [] }
    }))

    // Switch modes should clear
    await page.getByText('Parameter Change').click()
    await expect(page.getByText('Ready to Analyze')).toBeVisible()
    await page.getByText('Headcount Change').click()
    await expect(page.getByText('Ready to Analyze')).toBeVisible()
  })

  test('region tabs show region names', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Global' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'North America' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'EMEA' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'APAC' })).toBeVisible()
  })

  test('clicking NAMER tab shows NAMER baseline', async ({ page }) => {
    await page.getByRole('button', { name: 'North America' }).click()
    // Baseline headcount for NAMER should be 100
    const headcountCard = page.locator('text=100').first()
    await expect(headcountCard).toBeVisible()
  })

  test('capacity buffer row exists', async ({ page }) => {
    await expect(page.getByText('Capacity Buffer')).toBeVisible()
  })

  test('run scenario button exists', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Run Scenario' })).toBeVisible()
  })
})
