// 用户信息 VO
export interface UserInfoVO {
  userId: number
  username: string
  nickname: string
  phone: string | null
  deptId: number | null
  role: string // user / archive_admin / company_leader
  status: number
}

// 数据字典项 VO
export interface DictItemVO {
  itemId: number
  dictCode: string
  itemValue: string
  itemLabel: string
  sortOrder: number
  status: number // 0-停用, 1-启用
}

// 部门 VO
export interface DeptVO {
  deptId: number
  deptName: string
  parentId: number
  sortOrder: number
  children?: DeptVO[]
}

// 案卷列表 VO
export interface ArchiveVolumeListVO {
  recordId: number
  year: string
  archiveNo: string
  volumeTitle: string
  categoryName: string
  categoryL1: string
  categoryL1Label: string
  categoryL2: string
  securityLevel: string
  securityLevelLabel: string
  retentionPeriod: string
  retentionPeriodLabel: string
  status: number
  inStock: number
  destroyFlag: number
  pendingDestroy: number
  copies: number
  borrowedCopies: number
  compilerId: number
  compiler: string
  createdAt: string
  updatedAt: string
}

// 案卷详情 VO（与后端 ArchiveVolumeVO 对齐）
export interface ArchiveVolumeDetailVO extends ArchiveVolumeListVO {
  fondsNo: string
  categoryL3: string
  deviceCode: string
  volumeNo: string
  compileUnit: string
  fileCount: number
  totalPages: number
  compileDate: string
  compileDateActual: string
  reviewer: string
  inspectDate: string
  archiveDate: string
  notes: string
  remark: string
  categoryCode: string
  locationNo: string
  registerDate: string
  organization: string
}

// 借阅状态 VO
export interface BorrowVO {
  borrowId: number
  archiveNo: string
  volumeTitle: string
  borrowerId: number
  borrowerName: string
  borrowerDept: string
  borrowerPhone?: string
  applyCount: number
  reason: string
  status: number
  statusName: string
  borrowDate: string | null
  planReturnDate: string | null
  actualReturnDate: string | null
  createdAt: string
  remainingDays: number | null
  remindLevel: number
  volumeCopies?: number
  volumeAvailable?: number
}

// 卷内文件列表 VO
export interface ArchiveFileListVO {
  recordId: number
  year: string
  volumeNo: string
  archiveNo: string
  seqNo: number
  fileNo: string
  fileTitle: string
  responsible: string
  pages: number
  securityLevel: string
  securityLevelLabel: string
  archiveDate: string
  keywords: string
  originalPath: string
  remark: string
  destroyFlag: number
  status: number
  createdAt: string
  updatedAt: string
}

// 审批日志 VO
export interface ApproveLogVO {
  logId: number
  businessType: number
  businessTypeLabel: string
  targetId: number
  targetArchiveNo: string
  approverId: number
  approverName: string
  action: string
  actionName?: string
  opinion: string
  createdAt: string
}

// Dashboard 概览 VO
export interface YearArchiveStat {
  year: string
  count: number
}

export interface StatusDistribution {
  status: number
  statusName: string
  count: number
}

export interface DashboardOverviewVO {
  totalVolumeCount: number
  archivedCount: number
  currentBorrowedCount: number
  pendingApproveCount: number
  yearTrend: YearArchiveStat[]
  statusDistribution: StatusDistribution[]
}
