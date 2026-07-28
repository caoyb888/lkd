// 用户信息 VO
export interface UserInfoVO {
  userId: number
  username: string
  nickname: string
  phone: string | null
  deptId: number | null
  role: string        // user / archive_admin / company_leader
  status: number
}

// 数据字典项 VO
export interface DictItemVO {
  itemId: number
  dictCode: string
  itemValue: string
  itemLabel: string
  sortOrder: number
  status: number      // 0-停用, 1-启用
}

// 部门 VO
export interface DeptVO {
  deptId: number
  deptName: string
  parentId: number
  sortOrder: number
  children?: DeptVO[]
}

// 案卷列表 VO（与后端 ArchiveVolumeListVO 对齐）
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

// 借阅状态 VO（对应后端 ArchiveBorrowListVO / ArchiveBorrowVO）
export interface BorrowVO {
  borrowId: number
  archiveNo: string
  volumeTitle: string
  borrowerId: number
  borrowerName: string
  borrowerDept: string
  /** 脱敏手机号，如 138****5678 */
  borrowerPhone?: string
  applyCount: number
  reason: string
  status: number
  statusName: string
  /** 格式 yyyy-MM-dd HH:mm:ss */
  borrowDate: string | null
  /** 格式 yyyy-MM-dd HH:mm:ss */
  planReturnDate: string | null
  /** 格式 yyyy-MM-dd HH:mm:ss */
  actualReturnDate: string | null
  /** 格式 yyyy-MM-dd HH:mm:ss */
  createdAt: string
  /** 剩余天数（负数=已逾期天数），后端计算 */
  remainingDays: number | null
  /** 0-正常 1-即将到期(≤3天) 2-已逾期 */
  remindLevel: number
  /** 档案总份数 */
  volumeCopies?: number
  /** 剩余可借份数 */
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
