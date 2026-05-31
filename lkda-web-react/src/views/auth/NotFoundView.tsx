import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export default function NotFoundView() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background-soft">
      <h1 className="text-4xl font-bold text-slate-title">404</h1>
      <p className="text-slate-body mt-2">页面不存在</p>
      <Button className="mt-4" onClick={() => navigate('/')}>
        返回首页
      </Button>
    </div>
  )
}
