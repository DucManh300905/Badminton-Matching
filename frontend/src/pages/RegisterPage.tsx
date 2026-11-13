import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { toApiError } from '../api/client'
import type { RegisterInput } from '../api/types'
import { Alert, FieldError } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { GENDER_LABELS, LEVEL_LABELS, SKILL_LEVELS, type Gender, type SkillLevel } from '../lib/constants'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'

  const [form, setForm] = useState<RegisterInput>({
    email: '',
    password: '',
    displayName: '',
    gender: 'male',
    level: 'TB',
  })
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const set = <K extends keyof RegisterInput>(key: K, value: RegisterInput[K]) => setForm((f) => ({ ...f, [key]: value }))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setFields({})
    try {
      await register(form)
      navigate(from, { replace: true })
    } catch (err) {
      const info = toApiError(err)
      setError(info.message)
      setFields(info.fields)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">Tạo tài khoản</h1>
      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        {error && <Alert>{error}</Alert>}
        <div>
          <label htmlFor="displayName" className="label">
            Tên hiển thị
          </label>
          <input id="displayName" required className="input" value={form.displayName} onChange={(e) => set('displayName', e.target.value)} />
          <FieldError message={fields.displayName} />
        </div>
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input id="email" type="email" required autoComplete="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} />
          <FieldError message={fields.email} />
        </div>
        <div>
          <label htmlFor="password" className="label">
            Mật khẩu <span className="font-normal text-slate-400">(tối thiểu 8 ký tự)</span>
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="input"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
          />
          <FieldError message={fields.password} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="gender" className="label">
              Giới tính
            </label>
            <select id="gender" className="input" value={form.gender} onChange={(e) => set('gender', e.target.value as Gender)}>
              {Object.entries(GENDER_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="level" className="label">
              Trình độ
            </label>
            <select id="level" className="input" value={form.level} onChange={(e) => set('level', e.target.value as SkillLevel)}>
              {SKILL_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Giới tính và trình độ dùng để ghép bạn vào đúng chỗ trống của kèo. Chúng tôi không thu thập số điện thoại.
        </p>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? 'Đang tạo tài khoản…' : 'Đăng ký'}
        </button>
        <p className="text-center text-sm text-slate-500">
          Đã có tài khoản?{' '}
          <Link to="/dang-nhap" state={{ from }} className="font-semibold text-emerald-700 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </form>
    </div>
  )
}
