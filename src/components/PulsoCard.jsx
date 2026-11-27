export default function PulsoCard({ pulso }) {
  return (
    <article className="rounded-[24px] border border-ring-sand/25 bg-snow p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">{pulso.author}</span>
      </div>

      <p className="text-[15px] leading-6 text-ink">{pulso.content}</p>
    </article>
  )
}
