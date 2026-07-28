import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import router from './router'
import { setupPermissionDirective } from './directives/permission'
import App from './App.vue'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import '@/styles/global.scss'

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)

app.use(router)

// Element Plus 图标全量注册
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 权限指令 v-permission
setupPermissionDirective(app)

// 初始化主题（在挂载前应用，防止闪屏）
import { useThemeStore } from '@/stores/theme'
const themeStore = useThemeStore(pinia)
themeStore.setTheme(themeStore.theme)

app.mount('#app')
