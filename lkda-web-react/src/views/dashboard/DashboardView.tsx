import { Card, CardContent } from '@/components/ui/card'
import PageHeader from '@/components/PageHeader'

export default function DashboardView() {
  return (
    <div>
      <PageHeader title="数据概览" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent>
            <div className="text-sm text-slate-body">案卷总数</div>
            <div className="text-2xl font-bold text-slate-title mt-1">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-sm text-slate-body">在库数</div>
            <div className="text-2xl font-bold text-slate-title mt-1">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-sm text-slate-body">借阅中</div>
            <div className="text-2xl font-bold text-slate-title mt-1">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-sm text-slate-body">待审批</div>
            <div className="text-2xl font-bold text-slate-title mt-1">0</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
