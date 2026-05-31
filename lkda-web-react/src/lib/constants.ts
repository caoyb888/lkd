export const ROLE_CODES = {
  USER: 'user',
  ADMIN: 'admin',
  LEADER: 'leader',
} as const

export const VOLUME_STATUS = {
  DRAFT: 0,
  PENDING_AUDIT: 1,
  PENDING_CONFIRM: 2,
  ARCHIVED: 3,
} as const

export const BORROW_STATUS = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
  RETURNED: 3,
  OVERDUE: 4,
} as const
