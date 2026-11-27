/**
 * Field — label + input/textarea with Circulo focus ring.
 */
export default function Field({
  label,
  as = 'input',
  className = '',
  inputClassName = '',
  error,
  id,
  children,
  ...props
}) {
  const Control = as
  const controlId = id || (label ? `field-${String(label).toLowerCase().replace(/\s+/g, '-')}` : undefined)

  return (
    <label className={['block text-sm text-ink-muted', className].join(' ')} htmlFor={controlId}>
      {label}
      {children ?? (
        <Control id={controlId} className={['circulo-field mt-1', inputClassName].join(' ')} {...props} />
      )}
      {error ? <p className="mt-1.5 text-sm text-danger">{error}</p> : null}
    </label>
  )
}
