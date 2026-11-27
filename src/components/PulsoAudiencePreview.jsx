import { Users } from 'lucide-react'
import { circlesReached, visibilityHint } from '../lib/pulsoVisibility'

export default function PulsoAudiencePreview({
  circles = [],
  circleId,
  includeInner = true,
  onToggleCircle,
  variant = 'default',
}) {
  const reached = circlesReached(circles, circleId, includeInner)
  const reachedIds = new Set(reached.map((circle) => circle.id))
  const isComposer = variant === 'composer'
  const hint = isComposer ? null : visibilityHint(circles, circleId, includeInner)
  const interactive = typeof onToggleCircle === 'function'

  if (circles.length === 0) {
    return null
  }

  if (isComposer) {
    return (
      <div className="mt-2.5">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Users className="h-3 w-3 text-[#8d7c6b]" strokeWidth={1.8} />
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8d7c6b]">
            quem recebe
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {circles.map((circle) => {
            const active = reachedIds.has(circle.id)
            return (
              <button
                key={circle.id}
                type="button"
                disabled={!interactive}
                onClick={() => onToggleCircle?.(circle.id)}
                aria-label={circle.label}
                aria-pressed={active}
                title={active ? `Tirar ${circle.label}` : `Incluir ${circle.label}`}
                className="flex w-12 flex-col items-center gap-0.5 disabled:cursor-default"
                style={{ cursor: interactive ? 'pointer' : 'default' }}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold uppercase text-white shadow-[0_3px_8px_rgba(60,40,20,0.12)] transition"
                  style={{
                    background: circle.color,
                    opacity: active ? 1 : 0.38,
                    transform: active ? 'scale(1)' : 'scale(0.94)',
                    boxShadow: active ? `0 0 0 2px #fff, 0 0 0 3px ${circle.color}` : undefined,
                  }}
                >
                  {circle.label.slice(0, 1)}
                </span>
                <span className="max-w-full truncate text-[9px] font-medium text-[#6d5748]">
                  {circle.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-xl border border-[#eadfce] bg-[#fffaf4] px-2.5 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#90795e]">quem recebe</p>
      <div className="mt-1.5 flex items-center gap-1.5">
        {circles.map((circle, index) => {
          const active = reachedIds.has(circle.id)
          return (
            <div key={circle.id} className="flex items-center gap-1.5">
              {index > 0 ? <span className="h-px w-1.5 bg-[#eadfce]" /> : null}
              <button
                type="button"
                disabled={!interactive}
                onClick={() => onToggleCircle?.(circle.id)}
                aria-label={circle.label}
                aria-pressed={active}
                title={active ? `Tirar ${circle.label}` : `Incluir ${circle.label}`}
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 text-[8px] font-bold uppercase disabled:cursor-default"
                style={{
                  borderColor: circle.color,
                  background: active ? circle.color : '#fff',
                  color: active ? '#fff' : circle.color,
                  opacity: active ? 1 : 0.32,
                  cursor: interactive ? 'pointer' : 'default',
                }}
              >
                {circle.label.slice(0, 1)}
              </button>
            </div>
          )
        })}
      </div>
      {hint ? <p className="mt-1.5 text-[11px] leading-4 text-[#5a4b3f]">{hint}</p> : null}
    </div>
  )
}
