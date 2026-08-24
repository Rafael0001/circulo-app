const categoryStyles = {
  necessidade: { badge: 'bg-[#f9e0d0] text-[#a85f34]', dot: 'bg-[#ea8b5d]' },
  vontade: { badge: 'bg-[#dfeafc] text-[#4865a0]', dot: 'bg-[#6f88d9]' },
  sonho: { badge: 'bg-[#ebebfb] text-[#5d4f9a]', dot: 'bg-[#8c7be1]' },
  projeto: { badge: 'bg-[#e7f3df] text-[#4a784d]', dot: 'bg-[#74b86d]' },
}

export default function PulsoCard({ pulso }) {
  const style = categoryStyles[pulso.category] ?? categoryStyles.necessidade
  return (
    <article className="rounded-[24px] border border-[#f0e2d3] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${style.badge}`}>
            <span className={`h-2 w-2 rounded-full ${style.dot}`} />
            {pulso.category}
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.14em] text-[#9a8e80]">{pulso.author}</span>
      </div>

      <p className="text-[15px] leading-6 text-[#2f2c2a]">{pulso.content}</p>
    </article>
  )
}
