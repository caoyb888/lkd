import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import DashboardView from '@/views/dashboard/DashboardView'
import LoginView from '@/views/auth/LoginView'
import NotFoundView from '@/views/auth/NotFoundView'
import { authLoader } from './loaders'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    loader: authLoader,
    children: [
      { index: true, element: <DashboardView /> },
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
