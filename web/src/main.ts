// PDF.js worker 配置（必须在其他模块之前导入）
import './utils/pdfjs-config'

import App from './App.vue'
import { createApp } from 'vue'
import { initStore } from './store'                 // Store
import { initRouter } from './router'               // Router
import language from './locales'                    // 国际化
import '@styles/core/tailwind.css'                  // tailwind
import '@styles/index.scss'                         // 样式
import '@utils/sys/console.ts'                      // 控制台输出内容
import '@utils/ui/iconify-loader'                   // 离线图标加载器
import { setupGlobDirectives } from './directives'
import { setupErrorHandle } from './utils/sys/error-handle'
import { useSiteSettingsStore } from './store/modules/site-settings'

document.addEventListener(
  'touchstart',
  function () {},
  { passive: false }
)

const app = createApp(App)
initStore(app)

// 初始化系统设置（包括 favicon）
const siteSettingsStore = useSiteSettingsStore()
siteSettingsStore.initSettings()

initRouter(app)
setupGlobDirectives(app)
setupErrorHandle(app)

app.use(language)
app.mount('#app')