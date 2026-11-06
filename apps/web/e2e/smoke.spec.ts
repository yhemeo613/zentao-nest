import { test, expect } from '@playwright/test';

/** 冒烟：登录 → 双导航 → 需求列表 + 统计页可达 */
const ADMIN = { account: 'admin', password: 'Admin@123456' };

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('账号').fill(ADMIN.account);
  await page.getByPlaceholder('密码', { exact: false }).first().fill(ADMIN.password);
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test('顶部主导航切换语境（侧栏随之变化）', async ({ page }) => {
  await page.getByRole('link', { name: '产品' }).click();
  await expect(page).toHaveURL(/\/products/);
  await expect(page.locator('.el-menu').getByText('需求')).toBeVisible();
  await page.getByRole('link', { name: '测试' }).click();
  await expect(page).toHaveURL(/\/cases/);
  await expect(page.locator('.el-menu').getByText('测试单')).toBeVisible();
});

test('需求列表加载且状态为圆点样式', async ({ page }) => {
  await page.goto('/stories');
  await expect(page.getByRole('heading', { name: '需求' })).toBeVisible();
  await page.waitForSelector('.el-table__row', { timeout: 10_000 });
  await expect(page.locator('.status-dot').first()).toBeVisible();
});

test('统计页四区块渲染', async ({ page }) => {
  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: '统计' })).toBeVisible();
  await expect(page.getByText('项目概览', { exact: true })).toBeVisible();
  await expect(page.getByText('执行负载').first()).toBeVisible();
  await expect(page.getByText('产品质量 / 路线图', { exact: true })).toBeVisible();
});
