<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.js';
import { describeError } from '../../lib/errors.js';

// F0 登录页（后端 /auth/login 随 P1 交付——docs/01 §11）
// 表单行为真实调用接口：失败如实展示服务端错误，不做假成功（docs/06 §1 纪律）
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const form = reactive({ account: '', password: '' });
const submitting = ref(false);
const errorMessage = ref('');

async function handleSubmit(): Promise<void> {
  if (submitting.value) return;
  errorMessage.value = '';
  if (!form.account || !form.password) {
    errorMessage.value = '请输入账号与密码';
    return;
  }
  submitting.value = true;
  try {
    await auth.login({ account: form.account.trim(), password: form.password });
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard';
    void router.push(redirect);
  } catch (error) {
    const described = describeError(error);
    // 404（P1 未交付）转为明确提示而非误导性"账号密码错误"
    errorMessage.value = described.code === 3005 ? '登录接口尚未交付（P1）' : described.message;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center p-6">
    <div class="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-sm">
      <h1 class="mb-1 text-xl font-semibold">zentao-nest</h1>
      <p class="mb-6 text-sm text-muted-foreground">禅道复刻系统 · 管理端</p>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label class="mb-1 block text-sm" for="account">账号</label>
          <input
            id="account"
            v-model="form.account"
            type="text"
            autocomplete="username"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="P1 交付后可用 admin 登录"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm" for="password">密码</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="••••••••"
          />
        </div>

        <p v-if="errorMessage" class="text-sm text-destructive" role="alert">
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {{ submitting ? '登录中…' : '登录' }}
        </button>
      </form>
    </div>
  </div>
</template>
