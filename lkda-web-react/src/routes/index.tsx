import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import LoginView from '@/views/auth/LoginView'
import NotFoundView from '@/views/auth/NotFoundView'
import { authLoader } from './loaders'

/* ── Dashboard ── */
const DashboardView = lazy(() => import(/* webpackChunkName: "dashboard" */ '@/views/dashboard/DashboardView'))

/* ── Auth ── */
const ProfileView = lazy(() => import(/* webpackChunkName: "profile" */ '@/views/auth/ProfileView'))
const ChangePasswordView = lazy(() => import(/* webpackChunkName: "profile-password" */ '@/views/auth/ChangePasswordView'))

/* ── Demo ── */
const ComponentDemo = lazy(() => import(/* webpackChunkName: "demo" */ '@/views/demo/ComponentDemo'))

/* ── Volume ── */
const VolumeListView = lazy(() => import(/* webpackChunkName: "volume-list" */ '@/views/volume/VolumeListView'))
const VolumeEditView = lazy(() => import(/* webpackChunkName: "volume-edit" */ '@/views/volume/VolumeEditView'))
const VolumeDetailView = lazy(() => import(/* webpackChunkName: "volume-detail" */ '@/views/volume/VolumeDetailView'))
const VolumeImportView = lazy(() => import(/* webpackChunkName: "volume-import" */ '@/views/volume/VolumeImportView'))

/* ── File ── */
const FileListView = lazy(() => import(/* webpackChunkName: "file-list" */ '@/views/file/FileListView'))

/* ── Print ── */
const PrintPreviewView = lazy(() => import(/* webpackChunkName: "print-preview" */ '@/views/print/PrintPreviewView'))

/* ── Approve ── */
const PendingAuditView = lazy(() => import(/* webpackChunkName: "approve-review" */ '@/views/approve/PendingAuditView'))
const PendingConfirmView = lazy(() => import(/* webpackChunkName: "approve-confirm" */ '@/views/approve/PendingConfirmView'))
const ApproveHistoryView = lazy(() => import(/* webpackChunkName: "approve-history" */ '@/views/approve/ApproveHistoryView'))

/* ── Borrow ── */
const BorrowApplyView = lazy(() => import(/* webpackChunkName: "borrow-apply" */ '@/views/borrow/BorrowApplyView'))
const BorrowMyView = lazy(() => import(/* webpackChunkName: "borrow-my" */ '@/views/borrow/BorrowMyView'))
const BorrowApproveView = lazy(() => import(/* webpackChunkName: "borrow-approve" */ '@/views/borrow/BorrowApproveView'))
const BorrowHistoryView = lazy(() => import(/* webpackChunkName: "borrow-history" */ '@/views/borrow/BorrowHistoryView'))

/* ── Destroy ── */
const DestroyApplyView = lazy(() => import(/* webpackChunkName: "destroy-apply" */ '@/views/destroy/DestroyApplyView'))
const DestroyApproveView = lazy(() => import(/* webpackChunkName: "destroy-approve" */ '@/views/destroy/DestroyApproveView'))

/* ── Audit ── */
const AuditLogView = lazy(() => import(/* webpackChunkName: "audit-log" */ '@/views/audit/AuditLogView'))

/* ── System ── */
const UserListView = lazy(() => import(/* webpackChunkName: "system-user" */ '@/views/system/UserListView'))
const DeptListView = lazy(() => import(/* webpackChunkName: "system-dept" */ '@/views/system/DeptListView'))
const DictListView = lazy(() => import(/* webpackChunkName: "system-dict" */ '@/views/system/DictListView'))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    loader: authLoader,
    children: [
      { index: true, element: <DashboardView /> },
      { path: 'dashboard', element: <DashboardView /> },
      { path: 'demo', element: <ComponentDemo /> },
      { path: 'volume/list', element: <VolumeListView /> },
      { path: 'volume/edit', element: <VolumeEditView /> },
      { path: 'volume/edit/:id', element: <VolumeEditView /> },
      { path: 'volume/detail/:id', element: <VolumeDetailView /> },
      { path: 'file/list/:volumeId', element: <FileListView /> },
      { path: 'volume/import', element: <VolumeImportView /> },
      { path: 'print/preview/:volumeId', element: <PrintPreviewView /> },
      { path: 'approve/review', element: <PendingAuditView /> },
      { path: 'approve/confirm', element: <PendingConfirmView /> },
      { path: 'approve/history', element: <ApproveHistoryView /> },
      { path: 'borrow/apply/:archiveNo', element: <BorrowApplyView /> },
      { path: 'borrow/my', element: <BorrowMyView /> },
      { path: 'borrow/approve', element: <BorrowApproveView /> },
      { path: 'borrow/history', element: <BorrowHistoryView /> },
      { path: 'destroy/apply', element: <DestroyApplyView /> },
      { path: 'destroy/approve', element: <DestroyApproveView /> },
      { path: 'system/user', element: <UserListView /> },
      { path: 'system/dept', element: <DeptListView /> },
      { path: 'system/dict', element: <DictListView /> },
      { path: 'audit/log', element: <AuditLogView /> },
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
