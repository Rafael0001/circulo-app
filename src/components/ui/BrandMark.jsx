import ringsDark from '../../assets/brand/circulo-logo-rings.png'
import ringsLight from '../../assets/brand/circulo-logo-rings-light.png'
import smileDark from '../../assets/brand/circulo-logo-smile.png'
import smileLight from '../../assets/brand/circulo-logo-smile-light.png'

const ASSETS = {
  rings: ringsDark,
  'rings-light': ringsLight,
  smile: smileDark,
  'smile-light': smileLight,
}

const SIZE = {
  xs: 24,
  sm: 36,
  md: 64,
  lg: 112,
  xl: 160,
}

/**
 * BrandMark — Circulo logos.
 * @param {'rings'|'rings-light'|'smile'|'smile-light'|'pulsar'} variant
 *   rings / rings-light — full concentric mark
 *   smile / smile-light — minimal smile
 *   pulsar — orange core + smile (Home viz center hook)
 */
export default function BrandMark({
  variant = 'rings-light',
  size = 'md',
  className = '',
  label = 'Círculo',
  breathe = false,
  showLabel = true,
}) {
  const px = typeof size === 'number' ? size : SIZE[size] ?? SIZE.md

  if (variant === 'pulsar') {
    return (
      <span
        className={['inline-flex flex-col items-center gap-1', breathe ? 'brand-breathe' : '', className]
          .filter(Boolean)
          .join(' ')}
        role="img"
        aria-label={showLabel ? 'Pulsar' : label}
      >
        <span
          className="relative inline-flex shrink-0 items-center justify-center rounded-full bg-core text-smile shadow-soft"
          style={{ width: px, height: px }}
        >
          <svg viewBox="0 0 64 64" width={px * 0.55} height={px * 0.55} aria-hidden="true">
            <circle cx="24" cy="26" r="3.4" fill="currentColor" />
            <circle cx="40" cy="26" r="3.4" fill="currentColor" />
            <path
              d="M22 38c3.2 6.2 16.8 6.2 20 0"
              stroke="currentColor"
              strokeWidth="3.4"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </span>
        {showLabel ? (
          <span className="font-display text-label font-semibold tracking-wide text-core">Pulsar</span>
        ) : null}
      </span>
    )
  }

  const src = ASSETS[variant] ?? ASSETS['rings-light']

  return (
    <img
      src={src}
      alt={label}
      width={px}
      height={px}
      className={['inline-block object-contain', breathe ? 'brand-breathe' : '', className]
        .filter(Boolean)
        .join(' ')}
      draggable={false}
    />
  )
}
