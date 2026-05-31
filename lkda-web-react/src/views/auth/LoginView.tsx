import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export default function LoginView() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-soft px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-4">
          <h1 className="text-xl font-bold text-center text-slate-title">
            莱矿-档案管理系统
          </h1>
          <Input placeholder="用户名" />
          <Input type="password" placeholder="密码" />
          <Button className="w-full">登录</Button>
        </CardContent>
      </Card>
    </div>
  )
}
