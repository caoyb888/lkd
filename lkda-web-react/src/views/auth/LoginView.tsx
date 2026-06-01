import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/authStore'
import { useDictStore } from '@/stores/dictStore'
import { AlertCircle, Eye, EyeOff, Archive } from 'lucide-react'

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
    <div className="min-h-screen flex flex-col md:flex-row relative overflow-hidden">
      {/* ── 左侧/顶部品牌区 ───────────────────────────────────── */}
      <div
        className={cn(
          'relative flex flex-col items-center justify-center text-white',
          'md:w-[55%] md:min-h-screen',
          'max-md:h-[35vh] max-md:shrink-0'
        )}
        style={{ background: 'var(--color-header-bg)' }}
      >
        {/* 装饰 */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-[10%] left-[15%] w-32 h-32 rounded-full border-2 border-white" />
          <div className="absolute bottom-[20%] right-[10%] w-48 h-48 rounded-full border border-white" />
          <div className="absolute top-[40%] right-[25%] w-16 h-16 rounded-full bg-white/20" />
        </div>

        <div className="relative z-10 text-center md:text-left md:px-12">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mx-auto md:mx-0 mb-4 md:mb-6">
            <Archive size={36} className="text-white" />
          </div>
          <h1 className="text-2xl md:text-4xl font-bold tracking-wide mb-2 md:mb-3">
            莱矿-档案管理系统
          </h1>
          <p className="text-sm md:text-base text-white/80 max-w-sm">
            安全 · 高效 · 智能的档案数字化管理平台
          </p>
        </div>
      </div>

      {/* ── 右侧/底部登录表单区 ───────────────────────────────── */}
      <div className="flex-1 flex items-end md:items-center justify-center relative">
        {/* 手机端：底部卡片上滑效果 */}
        <div
          className={cn(
            'w-full max-md:rounded-t-[24px] max-md:bg-white max-md:shadow-[0_-8px_32px_rgba(0,0,0,0.08)]',
            'max-md:px-6 max-md:pt-8 max-md:pb-10',
            'md:w-full md:max-w-md md:px-8',
            'animate-in slide-in-from-bottom-4 duration-500'
          )}
        >
          {/* 电脑端毛玻璃卡片 */}
          <div
            className={cn(
              'md:p-8 md:rounded-card md:border md:border-white/30 md:shadow-xl',
              'md:bg-white/80 md:backdrop-blur-md',
              'dark:md:bg-slate-900/80'
            )}
          >
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[var(--color-slate-title)] mb-1">
                欢迎登录
              </h2>
              <p className="text-sm text-slate-body">
                请使用您的账号密码登录系统
              </p>
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

              <Button
                type="submit"
                className={cn('w-full mt-2', shake && 'animate-shake')}
                size="lg"
                loading={loading}
              >
                登录
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
