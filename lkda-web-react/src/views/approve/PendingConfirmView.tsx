import { UserCheck } from 'lucide-react'
import ApproveQueueView from './components/ApproveQueueView'
import { ApproveApi } from '@/api/approve'

export default function PendingConfirmView() {
  return (
    <ApproveQueueView
      title="待确认队列"
      pageIcon={<UserCheck size={22} className="text-blue-300" />}
      queryKeyPrefix="approve-confirm"
      fetchList={ApproveApi.pendingConfirm}
      doApprove={ApproveApi.confirm}
      passLabel="确认归档"
      backLabel="退回审核"
      emptyDesc="暂无待确认的案卷"
    />
  )
}
