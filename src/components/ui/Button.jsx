const VARIANTS = {
  primary:
    'bg-core text-smile shadow-soft hover:bg-core-soft active:scale-[0.98] disabled:bg-paper-deep disabled:text-ink-muted',
  secondary:
    'bg-ink text-smile shadow-soft hover:bg-ink/90 active:scale-[0.98] disabled:bg-paper-deep disabled:text-ink-muted',
  ghost:
    'bg-transparent text-ink-muted hover:bg-paper-deep hover:text-ink active:scale-[0.98] disabled:text-ink-muted/50',
  soft: 'bg-paper-deep text-ink hover:bg-ring-sand/30 active:scale-[0.98] disabled:opacity-50',
}

/**
 * Button — Circulo primitive.
 * Variants: primary (core), secondary (ink), ghost, soft.
 */
export default function Button({
  variant = 'primary',
  type = 'button',
  className = '',
  disabled = false,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={[
        'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-pill px-4 py-3 text-sm font-medium transition-[transform,background-color,opacity] duration-[var(--circulo-motion-fast)] ease-out disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant] ?? VARIANTS.primary,
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
