import { VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { permissionDirective } from './directives/permission.js';
import { createAppRouter } from './router/index.js';
import './style.css';

const app = createApp(App);

app.use(createPinia());
app.use(VueQueryPlugin);
app.use(createAppRouter());
app.directive('permission', permissionDirective);

app.mount('#app');
