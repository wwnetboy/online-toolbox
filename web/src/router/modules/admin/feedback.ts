import { AppRouteRecord } from '@/types/router'

/**
 * 用户反馈路由配置
 */
export const feedbackRoutes: AppRouteRecord = {
  name: 'Feedback',
  path: '/admin/feedback',
  component: '/index/index',
  redirect: '/admin/feedback/list',
  meta: {
    title: 'menus.admin.feedback.title',
    icon: 'ri:feedback-line',
    isFirstLevel: true
  },
  children: [
    {
      path: 'list',
      name: 'FeedbackList',
      component: '/system/feedback',
      meta: {
        title: 'menus.admin.feedback.title',
        icon: 'ri:feedback-line',
        isHide: true,
        activePath: '/admin/feedback'
      }
    }
  ]
}
