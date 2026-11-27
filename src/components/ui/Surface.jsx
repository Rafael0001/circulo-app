/**
 * Surface — selective container (not default card chrome).
 * Use when grouping interactive content; prefer bare layout otherwise.
 */
export default function Surface({ as: Tag = 'div', tone = 'snow', className = '', children, ...props }) {
  const tones = {
    snow: 'border-ring-sand/25 bg-snow/85',
    paper: 'border-ring-sand/20 bg-paper/90',
    deep: 'border-ring-sand/30 bg-paper-deep/90',
    ink: 'border-ink/20 bg-ink text-smile',
  }

  return (
    <Tag
      className={[
        'rounded-lg border p-5 shadow-soft backdrop-blur-sm',
        tones[tone] ?? tones.snow,
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </Tag>
  )
}
