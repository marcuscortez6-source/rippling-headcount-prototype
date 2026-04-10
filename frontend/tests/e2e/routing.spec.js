import { test, expect } from '@playwright/test'

// Mock all API calls with golden values so tests don't need a running backend
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
const UTILIZATION = [
  { region: 'NAMER', projected_utilization: 0.78125, utilization_target: 0.85, vs_target: -0.06875, ticket_volume: 40000, max_capacity: 43520, headroom_tickets: 3520, audit_trail: [] },
  { region: 'EMEA', projected_utilization: 0.683594, utilization_target: 0.85, vs_target: -0.166406, ticket_volume: 35000, max_capacity: 43520, headroom_tickets: 8520, audit_trail: [] },
  { region: 'APAC', projected_utilization: 0.651042, utilization_target: 0.85, vs_target: -0.198958, ticket_volume: 25000, max_capacity: 32640, headroom_tickets: 7640, audit_trail: [] },
]

async function mockAPIs(page) {
  await page.route('**/api/data/regions', route => route.fulfill({ json: REGIONS }))
  await page.route('**/api/data/assumptions', route => route.fulfill({ json: ASSUMPTIONS }))
  await page.route('**/api/compute/capacity', route => route.fulfill({ json: CAPACITY }))
  await page.route('**/api/compute/utilization', route => route.fulfill({ json: UTILIZATION }))
}

test.describe('Routing', () => {
  test('landing page shows chat interface', async ({ page }) => {
    await mockAPIs(page)
    await page.goto('/')
    await expect(page.getByPlaceholder('Ask AI Assistant')).toBeVisible()
    await expect(page.getByText('What would you like to plan?')).toBeVisible()
  })

  test('sidebar has three nav items', async ({ page }) => {
    await mockAPIs(page)
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Projected Capacity' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Scenario Planning' })).toBeVisible()
  })

  test('navigate to capacity page', async ({ page }) => {
    await mockAPIs(page)
    await page.goto('/')
    await page.getByRole('link', { name: 'Projected Capacity' }).click()
    await expect(page).toHaveURL(/\/capacity/)
    await expect(page.getByText('Global Overview')).toBeVisible()
  })

  test('navigate to scenario page', async ({ page }) => {
    await mockAPIs(page)
    await page.goto('/')
    await page.getByRole('link', { name: 'Scenario Planning' }).click()
    await expect(page).toHaveURL(/\/scenarios/)
    await expect(page.getByText('Scenario Planning').first()).toBeVisible()
  })

  test('direct URL navigation works', async ({ page }) => {
    await mockAPIs(page)
    await page.goto('/capacity')
    await expect(page.getByText('Global Overview')).toBeVisible()
    await page.goto('/scenarios')
    await expect(page.getByText('Scenario Planning').first()).toBeVisible()
  })
})
