import { VueQueryPlugin } from '@tanstack/vue-query';
import { MotionPlugin } from '@vueuse/motion';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { permissionDirective } from './directives/permission.js';
import { createAppRouter } from './router/index.js';
import { installAuthBridge } from './stores/auth.js';
import 'element-plus/dist/index.css';
import './style.css';

// UI 选型：Element Plus 整体替换 shadcn-vue 层（docs/05 §1 备选说明，2026-11-06 决策）；
// 图标 @element-plus/icons-vue，动画 @vueuse/motion，Markdown 预览 md-editor-v3——三方库优先（docs/10 §2）。
const app = createApp(App);

app.use(createPinia());
installAuthBridge();
app.use(VueQueryPlugin);
app.use(MotionPlugin);
app.use(ElementPlus, { locale: zhCn });
app.use(createAppRouter());
app.directive('permission', permissionDirective);

app.mount('#app');
