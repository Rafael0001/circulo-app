import { AlertTriangle, Zap } from 'lucide-react'

const priorityFlags = {
  is_importante: {
    label: 'importante',
    color: '#E8C87A',
    icon: AlertTriangle,
  },
  is_urgente: {
    label: 'urgente',
    color: '#F4956A',
    icon: Zap,
  },
}

export default function PulsoCard({ pulso }) {
  const activeFlags = Object.entries(priorityFlags).filter(([key]) => pulso[key])

  return (
    <article className="rounded-[24px] border border-[#f0e2d3] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {activeFlags.map(([key, flag]) => {
            const Icon = flag.icon
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
                style={{
                  borderColor: `${flag.color}66`,
                  background: `${flag.color}1A`,
                  color: flag.color,
                }}
              >
                <Icon className="h-3.5 w-3.5" fill="currentColor" strokeWidth={1.5} />
                {flag.label}
              </span>
            )
          })}
        </div>
        <span className="text-[10px] uppercase tracking-[0.14em] text-[#9a8e80]">{pulso.author}</span>
      </div>

      <p className="text-[15px] leading-6 text-[#2f2c2a]">{pulso.content}</p>
    </article>
  )
}
