import { Clock } from 'lucide-react'
import ApproveQueueView from './components/ApproveQueueView'
import { ApproveApi } from '@/api/approve'

export default function PendingAuditView() {
  return (
    <ApproveQueueView
      title="待审核队列"
      pageIcon={<Clock size={22} className="text-yellow-600" />}
      queryKeyPrefix="approve-review"
      fetchList={ApproveApi.pendingReview}
      doApprove={ApproveApi.review}
      passLabel="审核通过"
      backLabel="退回修改"
      emptyDesc="暂无待审核的案卷"
    />
  )
}
