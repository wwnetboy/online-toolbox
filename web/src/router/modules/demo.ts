import { AppRouteRecord } from '@/types/router'
import { templateRoutes } from './template'
import { widgetsRoutes } from './widgets'
import { examplesRoutes } from './examples'
import { systemRoutes } from './system'
import { articleRoutes } from './article'
import { resultRoutes } from './result'
import { exceptionRoutes } from './exception'
import { safeguardRoutes } from './safeguard'
import { helpRoutes } from './help'

/**
 * 模板演示路由配置
 * 包含框架原有的所有演示功能
 */
export const demoRoutes: AppRouteRecord = {
  name: 'Demo',
  path: '/admin/demo',
  component: '/index/index',
  meta: {
    title: '模板演示',
    icon: 'ri:layout-grid-line',
    order: 999 // 排序靠后
  },
  children: [
    // 将原有的路由作为子路由
    {
      ...templateRoutes,
      path: 'template',
      meta: {
        ...templateRoutes.meta,
        title: 'menus.template.title'
      }
    },
    {
      ...widgetsRoutes,
      path: 'widgets',
      meta: {
        ...widgetsRoutes.meta,
        title: 'menus.widgets.title'
      }
    },
    {
      ...examplesRoutes,
      path: 'examples',
      meta: {
        ...examplesRoutes.meta,
        title: 'menus.examples.title'
      }
    },
    {
      ...systemRoutes,
      path: 'system',
      meta: {
        ...systemRoutes.meta,
        title: 'menus.system.title'
      }
    },
    {
      ...articleRoutes,
      path: 'article',
      meta: {
        ...articleRoutes.meta,
        title: 'menus.article.title'
      }
    },
    {
      ...resultRoutes,
      path: 'result',
      meta: {
        ...resultRoutes.meta,
        title: 'menus.result.title'
      }
    },
    {
      ...exceptionRoutes,
      path: 'exception',
      meta: {
        ...exceptionRoutes.meta,
        title: 'menus.exception.title'
      }
    },
    {
      ...safeguardRoutes,
      path: 'safeguard',
      meta: {
        ...safeguardRoutes.meta,
        title: 'menus.safeguard.title'
      }
    }
  ]
}

// 导出帮助路由（保持独立）
export { helpRoutes }
