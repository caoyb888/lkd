import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { AuthApi } from '@/api/auth'
import { toast } from '@/components/ui/toast'
import PageHeader from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, Info, AlertCircle, Eye, EyeOff } from 'lucide-react'

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[$@$!%*#?&])[A-Za-z\d$@$!%*#?&]{6,}$/

const changePwdSchema = z
  .object({
    oldPassword: z.string().min(1, '请输入当前密码'),
    newPassword: z
      .string()
      .min(1, '请输入新密码')
      .regex(
        PASSWORD_REGEX,
        '须包含字母、数字及特殊字符（$@!%*#?&），长度 ≥ 6 位'
      ),
    confirmPassword: z.string().min(1, '请再次输入新密码'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  })

type ChangePwdFormData = z.infer<typeof changePwdSchema>

function PasswordStrength({ password }: { password: string }) {
  const score = useMemo(() => {
    if (!password) return 0
    let s = 0
    if (password.length >= 6) s++
    if (password.length >= 10) s++
    if (/[A-Za-z]/.test(password)) s++
    if (/\d/.test(password)) s++
    if (/[$@$!%*#?&]/.test(password)) s++
    return s
  }, [password])

  if (!password) return null

  const label =
    score <= 1
      ? { text: '弱', color: 'text-red-400', bar: 'bg-red-500' }
      : score <= 3
        ? { text: '中', color: 'text-orange-400', bar: 'bg-orange-500' }
        : { text: '强', color: 'text-green-400', bar: 'bg-green-500' }

  return (
    <div className="flex items-center gap-2.5 mt-2 animate-in fade-in slide-in-from-top-1">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-8 h-1 rounded-sm transition-colors duration-300',
              i < score ? label.bar : 'bg-[var(--color-bg-soft)]'
            )}
          />
        ))}
      </div>
      <span className={cn('text-xs font-semibold', label.color)}>
        强度：{label.text}
      </span>
    </div>
  )
}

export default function ChangePasswordView() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ChangePwdFormData>({
    resolver: zodResolver(changePwdSchema),
    mode: 'onChange',
  })

  const newPassword = watch('newPassword') || ''

  const onSubmit = async (data: ChangePwdFormData) => {
    setLoading(true)
    try {
      await AuthApi.changePassword({
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      })
      toast.success('密码修改成功，即将跳转至登录页')
      logout()
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1200)
    } finally {
      setLoading(false)
    }
  }

  const inputWrapClass = 'relative'
  const eyeBtnClass =
    'absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] hover:text-slate-body'

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="修改密码" />

      <div className="flex justify-center">
        <Card className="w-full max-w-[520px]">
          <CardContent className="p-6 md:p-9">
            {/* Top Icon Area */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br from-[var(--color-bg-lighter)] to-[var(--color-border-light)] flex items-center justify-center flex-shrink-0">
                <Lock size={24} className="text-primary-dark" />
              </div>
              <div>
                <p className="text-base font-semibold text-[var(--color-slate-title)]">
                  修改登录密码
                </p>
                <p className="text-xs text-slate-body mt-0.5">
                  修改成功后，系统将自动退出，请使用新密码重新登录
                </p>
              </div>
            </div>

            <div className="border-t border-[var(--color-border-light)] mb-6" />

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Old Password */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-[var(--color-slate-body)]">
                  当前密码
                </label>
                <div className={inputWrapClass}>
                  <Input
                    type={showOld ? 'text' : 'password'}
                    placeholder="请输入当前密码"
                    autoComplete="current-password"
                    {...register('oldPassword')}
                  />
                  <button
                    type="button"
                    className={eyeBtnClass}
                    onClick={() => setShowOld(!showOld)}
                  >
                    {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.oldPassword && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.oldPassword.message}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-[var(--color-slate-body)]">
                  新密码
                </label>
                <div className={inputWrapClass}>
                  <Input
                    type={showNew ? 'text' : 'password'}
                    placeholder="字母 + 数字 + 特殊字符，长度 ≥ 6 位"
                    autoComplete="new-password"
                    {...register('newPassword')}
                  />
                  <button
                    type="button"
                    className={eyeBtnClass}
                    onClick={() => setShowNew(!showNew)}
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrength password={newPassword} />
                {errors.newPassword && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.newPassword.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-[var(--color-slate-body)]">
                  确认新密码
                </label>
                <div className={inputWrapClass}>
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="请再次输入新密码"
                    autoComplete="new-password"
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    className={eyeBtnClass}
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Rules Tip */}
              <div className="flex items-start gap-2 p-3 rounded-btn bg-yellow-500/15 border border-yellow-500/30 text-xs text-yellow-300 leading-relaxed">
                <Info size={14} className="text-yellow-400 mt-0.5 shrink-0" />
                <span>
                  密码须同时包含<strong>字母</strong>、<strong>数字</strong>、
                  <strong>特殊字符</strong>（$ @ ! % * # ? &），且长度不少于 6 位
                </span>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={() => navigate(-1)}
                >
                  取消
                </Button>
                <Button type="submit" loading={loading} className="min-w-[120px]">
                  确认修改
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
