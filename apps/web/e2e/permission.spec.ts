import { test, expect } from '@playwright/test';

/** E15：越权（无 user.browse 的受限账号访问系统管理 → 403 页） */
test('受限账号访问系统管理跳转 403', async ({ page }) => {
  await page.goto('/login');
  // tester01 种子账号：仅质量域权限，无 user.browse
  await page.getByPlaceholder('账号').fill('tester01');
  await page.getByPlaceholder('密码', { exact: false }).first().fill('Test@123456');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto('/system/users');
  await expect(page).toHaveURL(/\/403/);
  await expect(page.getByText('您没有访问该页面的功能权限')).toBeVisible();
});
