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
  categoryL1: string
  categoryL1Label: string
  securityLevel: string
  securityLevelLabel: string
  retentionPeriod: string
  retentionPeriodLabel: string
  status: number
  inStock: number
  destroyFlag: number
  pendingDestroy: number
  compiler: string
  createdAt: string
  updatedAt: string
}

// 案卷详情 VO
export interface ArchiveVolumeDetailVO extends ArchiveVolumeListVO {
  fondsNo: string
  categoryL2: string
  categoryL3: string
  equipmentCode: string
  volumeNo: string
  compilingUnit: string
  copies: number
  borrowedCopies: number
  pageCount: number
  compilerId: number
  compilerName: string
  compileDate: string
  reviewerName: string
  archiveDate: string
  remark: string
  note: string
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
  opinion: string
  createdAt: string
}
