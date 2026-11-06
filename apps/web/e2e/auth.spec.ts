import { test, expect } from '@playwright/test';

/** E1：登录链（登录成功→进入地盘；错误密码如实报错；登出回登录页） */
const ADMIN = { account: 'admin', password: 'Admin@123456' };

test('登录成功进入我的地盘', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('账号').fill(ADMIN.account);
  await page.getByPlaceholder('密码', { exact: false }).first().fill(ADMIN.password);
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText('我的地盘').first()).toBeVisible();
});

test('错误密码展示服务端错误', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('账号').fill(ADMIN.account);
  await page.getByPlaceholder('密码', { exact: false }).first().fill('Wrong@123');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page.locator('.el-message--error')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('登出回登录页', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('账号').fill(ADMIN.account);
  await page.getByPlaceholder('密码', { exact: false }).first().fill(ADMIN.password);
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.locator('.el-dropdown').first().click();
  await page.getByText('退出登录').click();
  await expect(page).toHaveURL(/\/login/);
});
