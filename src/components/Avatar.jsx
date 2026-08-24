export default function Avatar({ name, initials, size = 52, color = '#F7D7B3', className = '' }) {
  return (
    <div
      className={['flex items-center justify-center rounded-full font-semibold text-slate-700 shadow-sm ring-2 ring-white', className].join(' ')}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color}, #fffdf9)`,
        fontSize: Math.max(12, size * 0.38),
      }}
      title={name}
    >
      {initials}
    </div>
  )
}
