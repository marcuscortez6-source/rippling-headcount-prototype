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

test.describe('Projected Capacity Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAPIs(page)
    await page.goto('/capacity')
  })

  test('global summary cards show correct totals', async ({ page }) => {
    await expect(page.getByText('230').first()).toBeVisible()        // agents
    await expect(page.getByText('119,680')).toBeVisible()           // max capacity
    await expect(page.getByText('100,000')).toBeVisible()           // volume
  })

  test('region cards show correct utilization', async ({ page }) => {
    await expect(page.getByText('78.1%')).toBeVisible()  // NAMER
    await expect(page.getByText('68.4%')).toBeVisible()  // EMEA
    await expect(page.getByText('65.1%')).toBeVisible()  // APAC
  })

  test('headroom values correct per region', async ({ page }) => {
    await expect(page.getByText('3,520', { exact: true })).toBeVisible()   // NAMER headroom
    await expect(page.getByText('8,520', { exact: true })).toBeVisible()   // EMEA headroom
    await expect(page.getByText('7,640', { exact: true })).toBeVisible()   // APAC headroom
  })

  test('all regions show On Track badge', async ({ page }) => {
    // All three regions are below 85% utilization
    const badges = page.getByText('On Track')
    await expect(badges.first()).toBeVisible()
  })
})
