import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { postsApi, toApiError } from '../api/client'
import type { PostFilter, PostSummary } from '../api/types'
import { PostCard } from '../components/PostCard'
import { Alert, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { HANOI_AREAS } from '../lib/constants'

export function HomePage() {
  const { user } = useAuth()
  // Bộ lọc nằm trên URL (?district=...&date=...) → chia sẻ link hoặc F5 vẫn giữ nguyên.
  const [params, setParams] = useSearchParams()
  const district = params.get('district') ?? ''
  const date = params.get('date') ?? ''
  const myLevel = params.get('myLevel') === '1'

  const filter: PostFilter = {}
  if (district) filter.district = district
  if (date) filter.date = date
  if (myLevel && user) filter.level = user.level
  // Khóa của bộ lọc hiện tại: kết quả chỉ được hiển thị nếu khớp khóa này.
  const filterKey = JSON.stringify(filter)

  const [result, setResult] = useState<{ key: string; posts?: PostSummary[]; error?: string } | null>(null)
  const loading = result?.key !== filterKey
  const posts = loading ? null : (result.posts ?? null)
  const error = loading ? null : (result.error ?? null)

  useEffect(() => {
    let cancelled = false
    postsApi
      .list(JSON.parse(filterKey) as PostFilter)
      .then((p) => !cancelled && setResult({ key: filterKey, posts: p }))
      .catch((e) => !cancelled && setResult({ key: filterKey, error: toApiError(e).message }))
    return () => {
      cancelled = true
    }
  }, [filterKey])

  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kèo sắp diễn ra</h1>
          <p className="text-sm text-slate-500">Tìm kèo còn chỗ, bấm vào để xem chi tiết và tham gia.</p>
        </div>
        <Link to="/keo/moi" className="btn-primary">
          + Đăng kèo
        </Link>
      </section>

      <section className="card grid gap-3 p-4 sm:grid-cols-3" aria-label="Bộ lọc">
        <div>
          <label htmlFor="f-district" className="label">
            Khu vực
          </label>
          <select id="f-district" className="input" value={district} onChange={(e) => update('district', e.target.value)}>
            <option value="">Tất cả</option>
            {HANOI_AREAS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-date" className="label">
            Ngày
          </label>
          <input id="f-date" type="date" className="input" value={date} onChange={(e) => update('date', e.target.value)} />
        </div>
        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-2 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="size-4 accent-emerald-600"
              checked={myLevel}
              disabled={!user}
              onChange={(e) => update('myLevel', e.target.checked ? '1' : '')}
            />
            Hợp trình độ của tôi
            {!user && <span className="text-xs text-slate-400">(cần đăng nhập)</span>}
          </label>
        </div>
      </section>

      {error && <Alert>{error}</Alert>}
      {loading && <Spinner />}
      {posts && posts.length === 0 && (
        <div className="card p-8 text-center text-sm text-slate-500">
          Chưa có kèo nào phù hợp.{' '}
          <Link to="/keo/moi" className="font-semibold text-emerald-700 hover:underline">
            Đăng kèo đầu tiên
          </Link>
        </div>
      )}
      {posts && posts.length > 0 && (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id}>
              <PostCard post={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
