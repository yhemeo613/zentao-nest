<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { useAuthStore } from '../../stores/auth.js';
import { describeError } from '../../lib/errors.js';

// 登录页（EP 表单 + 服务端错误如实展示，docs/06 §1 纪律）
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const formRef = ref<FormInstance>();
const form = reactive({ account: '', password: '' });
const submitting = ref(false);

const rules: FormRules = {
  account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || submitting.value) return;
  submitting.value = true;
  try {
    await auth.login({ account: form.account.trim(), password: form.password });
    ElMessage.success('登录成功');
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard';
    void router.push(redirect);
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-dvh">
    <!-- 品牌区：墨色 × 仪表青 -->
    <div class="hidden w-1/2 flex-col justify-between bg-[#16181d] p-10 lg:flex">
      <div class="num text-lg font-semibold tracking-wide text-zinc-100">ztn</div>
      <div>
        <h1 class="text-2xl font-semibold text-zinc-100">研发综合管理平台</h1>
        <p class="mt-3 max-w-md text-sm leading-6 text-zinc-400">
          项目集 / 产品 / 项目 / 执行四层框架，需求、任务、Bug、用例、测试单全链路闭环。
        </p>
      </div>
      <p class="text-xs text-zinc-600">zentao-nest · 管理端</p>
    </div>

    <div class="flex w-full items-center justify-center bg-background p-6 lg:w-1/2">
      <div class="w-full max-w-sm">
        <h2 class="mb-1 text-xl font-semibold">登录</h2>
        <p class="mb-6 text-sm text-muted-foreground">请输入账号与密码</p>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          @submit.prevent="handleSubmit"
        >
          <el-form-item label="账号" prop="account">
            <el-input
              v-model="form.account"
              autocomplete="username"
              placeholder="账号"
              @keyup.enter="handleSubmit"
            />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              show-password
              autocomplete="current-password"
              placeholder="密码"
              @keyup.enter="handleSubmit"
            />
          </el-form-item>
          <el-button type="primary" class="mt-2 w-full" :loading="submitting" @click="handleSubmit">
            登录
          </el-button>
        </el-form>
      </div>
    </div>
  </div>
</template>
