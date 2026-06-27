import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useDictStore } from '@/stores/dictStore'
import {
  AlertCircle,
  Eye,
  EyeOff,
  User,
  Lock,
  Gem,
  ArrowRight,
  KeyRound,
  Check,
} from 'lucide-react'

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[$@$!%*#?&])[A-Za-z\d$@$!%*#?&]{6,}$/

const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
})

type LoginFormData = z.infer<typeof loginSchema>

const DEPTH_TICKS = ['-000', '-048', '-096', '-132', '-164', '-216']

export default function LoginView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuthStore()
  const { loadAll } = useDictStore()
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [remember, setRemember] = useState(true)

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
    <div className="strata login-page">
      <div className="login">
        {/* ── 左侧：岩层视觉区 ─────────────────────────────────── */}
        <aside className="login-side">
          <div className="login-side-bg strata-bands" />
          <div className="login-side-bg sediment" style={{ opacity: 0.6 }} />
          <div
            className="login-side-bg contour"
            style={{ ['--cx' as string]: '78%', ['--cy' as string]: '110%', opacity: 0.5 }}
          />
          <div className="login-side-bg vein" style={{ opacity: 0.7 }} />
          <div className="scanline" />

          <div className="login-ticks mono">
            {DEPTH_TICKS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="login-side-copy">
            <span className="eyebrow" style={{ color: 'rgba(255,255,255,.7)' }}>
              莱矿集团 · 档案管理中心
            </span>
            <h1 className="login-vert">灵动智档</h1>
            <p className="grotesk login-side-sub">LINGDONG · SMART ARCHIVES</p>
          </div>

          <div className="login-side-foot mono">
            <span>地质 · 采矿 · 安全 · 设备 · 财务 · 行政</span>
            <span>六大门类 · 全生命周期管理</span>
          </div>
        </aside>

        {/* ── 右侧：登录表单 ───────────────────────────────────── */}
        <main className="login-main">
          <form className="login-card" onSubmit={handleSubmit(onSubmit)}>
            <div className="brandmark">
              <span className="bm-glyph">
                <Gem size={20} />
              </span>
              <div className="col">
                <strong className="bm-name">灵动智档</strong>
                <span className="eyebrow">ARCHIVE COMMAND</span>
              </div>
            </div>

            <div className="login-h">
              <h2>欢迎回来</h2>
              <p className="login-hint">请使用工号或账号登录档案管理系统</p>
            </div>

            <div className="field">
              <label>工号 / 账号</label>
              <div className="input-wrap">
                <span className="ico">
                  <User size={17} />
                </span>
                <input
                  className="input"
                  autoComplete="username"
                  placeholder="LK-0427"
                  {...register('username')}
                />
              </div>
              {errors.username && (
                <p className="err mono">
                  <AlertCircle size={12} />
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="field">
              <label>密码</label>
              <div className="input-wrap">
                <span className="ico">
                  <Lock size={17} />
                </span>
                <input
                  className="input"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="请输入密码"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="pwd-toggle"
                  onClick={() => setShowPwd(!showPwd)}
                  aria-label={showPwd ? '隐藏密码' : '显示密码'}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="err mono">
                  <AlertCircle size={12} />
                  {errors.password.message}
                </p>
              )}
              {pwdHintVisible && (
                <p className="err mono" style={{ color: 'var(--c-ore)' }}>
                  密码需包含字母、数字及特殊字符，至少6位
                </p>
              )}
            </div>

            <div className="login-row">
              <span className="check" onClick={() => setRemember(!remember)}>
                <span className={cn('box', remember && 'on')}>
                  {remember && <Check size={11} strokeWidth={3} />}
                </span>
                记住此设备
              </span>
              <span className="link mono">忘记密码?</span>
            </div>

            <button
              type="submit"
              className={cn('btn btn-primary login-go', loading && 'busy', shake && 'animate-shake')}
            >
              {loading ? (
                <span className="spinner" />
              ) : (
                <>
                  <span>进入指挥中心</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="login-or">
              <span>或</span>
            </div>
            <button type="button" className="btn btn-ghost login-sso" disabled>
              <KeyRound size={16} /> 统一身份认证 (SSO)
            </button>

            <div className="login-foot mono">
              <span>涉密系统 · 请妥善保管账号</span>
              <span className="flex center" style={{ gap: 6 }}>
                <span
                  className="dot"
                  style={{ background: 'var(--c-teal)', animation: 'strata-pulse 2s infinite' }}
                />
                系统在线
              </span>
            </div>
          </form>
        </main>
      </div>
    </div>
  )
}
