import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/stores/authStore'
import { useDictStore } from '@/stores/dictStore'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[$@$!%*#?&])[A-Za-z\d$@$!%*#?&]{6,}$/

const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuthStore()
  const { loadAll } = useDictStore()
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const password = watch('password') || ''
  const pwdHintVisible = password.length > 0 && !PASSWORD_REGEX.test(password)

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true)
    try {
      await login(data.username.trim(), data.password)
      // 一次性预加载全部字典（失败不阻塞登录）
      await loadAll().catch(() => {})
      // 跳转
      const redirect = searchParams.get('redirect') || '/dashboard'
      navigate(redirect, { replace: true })
    } catch {
      setShake(true)
      setTimeout(() => setShake(false), 600)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background-soft to-primary/5 relative overflow-hidden px-4">
      {/* 装饰背景 */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/5 blur-3xl" />

      <Card
        className={cn(
          'w-full max-w-sm relative z-10 backdrop-blur-sm bg-white/90 dark:bg-slate-900/90 border-white/20 shadow-xl',
          shake && 'animate-shake'
        )}
      >
        <CardContent className="p-6 md:p-8 space-y-5">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold text-[var(--color-slate-title)]">
              莱矿-档案管理系统
            </h1>
            <p className="text-sm text-slate-body">请登录您的账号</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--color-slate-title)]">
                用户名
              </label>
              <Input
                placeholder="请输入用户名"
                autoComplete="username"
                {...register('username')}
              />
              {errors.username && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--color-slate-title)]">
                密码
              </label>
              <div className="relative">
                <Input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.password.message}
                </p>
              )}
              {pwdHintVisible && (
                <p className="text-xs text-orange-500">
                  密码需包含字母、数字及特殊字符，至少6位
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              登录
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
