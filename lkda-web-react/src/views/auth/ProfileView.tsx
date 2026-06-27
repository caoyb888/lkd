import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { desensitizePhone } from '@/lib/desensitize'
import PageHeader from '@/components/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, Smile, Smartphone, Shield, Lock, Edit3 } from 'lucide-react'

const ROLE_LABEL: Record<string, string> = {
  archive_admin: '档案管理员',
  user: '普通用户',
  company_leader: '公司领导',
}

const ROLE_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  archive_admin: 'success',
  user: 'default',
  company_leader: 'warning',
}

export default function ProfileView() {
  const navigate = useNavigate()
  const { userInfo } = useAuthStore()

  const avatarLetter = userInfo?.nickname?.[0]?.toUpperCase() ?? 'U'
  const role = userInfo?.role ?? ''
  const roleLabel = ROLE_LABEL[role] ?? role

  const infoItems = [
    { icon: User, label: '用户名', value: userInfo?.username ?? '—' },
    { icon: Smile, label: '昵称', value: userInfo?.nickname ?? '—' },
    { icon: Smartphone, label: '手机号', value: userInfo?.phone ? desensitizePhone(userInfo.phone) : '—' },
    { icon: Shield, label: '角色', value: roleLabel },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <PageHeader title="个人中心" />

      {/* Hero Card */}
      <div
        className={cn(
          'flex items-center gap-6 p-6 md:p-7 rounded-card border border-[var(--color-border-light)] bg-gradient-to-br from-[var(--color-bg-soft)] to-[var(--color-bg-lighter)] shadow-card'
        )}
      >
        <div className="p-[3px] rounded-full bg-gradient-to-br from-primary to-primary-dark flex-shrink-0">
          <div className="w-[72px] h-[72px] md:w-[76px] md:h-[76px] rounded-full bg-[var(--color-bg-main)] flex items-center justify-center text-primary-dark text-[28px] md:text-[32px] font-bold">
            {avatarLetter}
          </div>
        </div>
        <div>
          <h2 className="text-xl md:text-[22px] font-bold text-[var(--color-slate-title)] mb-2">
            {userInfo?.nickname}
          </h2>
          <Badge variant={ROLE_VARIANT[role] ?? 'default'}>{roleLabel}</Badge>
        </div>
      </div>

      {/* Basic Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <User size={16} className="text-primary" />
            基本信息
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {infoItems.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  className={cn(
                    'flex items-center gap-3.5 p-3.5 rounded-btn bg-[var(--color-bg-lighter)] border border-transparent hover:border-[var(--color-border-medium)] transition-colors'
                  )}
                >
                  <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[var(--color-bg-lighter)] to-[var(--color-border-light)] flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-primary-dark" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] text-slate-body tracking-wide">
                      {item.label}
                    </span>
                    <span className="text-sm font-medium text-[var(--color-slate-title)] truncate">
                      {item.value}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Security Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <Lock size={16} className="text-primary" />
            账号安全
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[var(--color-slate-title)]">
                登录密码
              </div>
              <div className="text-xs text-slate-body mt-1">
                定期修改密码有助于保护账号安全
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-primary text-primary hover:bg-primary hover:text-white transition-colors"
              onClick={() => navigate('/profile/password')}
            >
              <Edit3 size={14} className="mr-1" />
              修改密码
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
