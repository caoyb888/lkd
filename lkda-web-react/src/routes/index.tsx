import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import DashboardView from '@/views/dashboard/DashboardView'
import LoginView from '@/views/auth/LoginView'
import NotFoundView from '@/views/auth/NotFoundView'
import ProfileView from '@/views/auth/ProfileView'
import ChangePasswordView from '@/views/auth/ChangePasswordView'
import ComponentDemo from '@/views/demo/ComponentDemo'
import { authLoader } from './loaders'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    loader: authLoader,
    children: [
      { index: true, element: <DashboardView /> },
      { path: 'dashboard', element: <DashboardView /> },
      { path: 'demo', element: <ComponentDemo /> },
      { path: 'volume/list', element: <div className="text-slate-title">案卷目录</div> },
      { path: 'volume/import', element: <div className="text-slate-title">Excel 导入</div> },
      { path: 'approve/review', element: <div className="text-slate-title">待审核队列</div> },
      { path: 'approve/confirm', element: <div className="text-slate-title">待确认队列</div> },
      { path: 'approve/history', element: <div className="text-slate-title">审批历史</div> },
      { path: 'borrow/my', element: <div className="text-slate-title">我的借阅</div> },
      { path: 'borrow/approve', element: <div className="text-slate-title">借阅审批</div> },
      { path: 'borrow/history', element: <div className="text-slate-title">借阅历史</div> },
      { path: 'destroy/approve', element: <div className="text-slate-title">销毁审批</div> },
      { path: 'system/user', element: <div className="text-slate-title">用户管理</div> },
      { path: 'system/dept', element: <div className="text-slate-title">部门管理</div> },
      { path: 'system/dict', element: <div className="text-slate-title">数据字典</div> },
      { path: 'audit/log', element: <div className="text-slate-title">审计日志</div> },
      { path: 'profile', element: <ProfileView /> },
      { path: 'profile/password', element: <ChangePasswordView /> },
    ],
  },
  {
    path: '/login',
    element: <LoginView />,
  },
  {
    path: '*',
    element: <NotFoundView />,
  },
])
