import { PULSO_DURATIONS, durationLabel } from '../lib/pulsoVisibility'

export default function PulsoSettings({
  circles,
  durationHours,
  includeInner,
  circleId,
  onChange,
  compact = false,
  formId = 'new',
  showLegend = true,
}) {
  const fieldClass = compact
    ? 'mt-1 w-full rounded-xl border border-[#eddcc7] bg-[#fffaf4] px-2.5 py-1.5 text-sm outline-none focus:border-[#d4a86d]'
    : 'mt-1 w-full rounded-2xl border border-[#eddcc7] bg-[#fffaf4] px-3 py-2.5 outline-none transition focus:border-[#d4a86d]'
  const labelClass = compact ? 'block text-xs text-[#5a4b3f]' : 'block text-sm text-[#5a4b3f]'

  return (
    <fieldset className={compact ? 'space-y-3' : 'space-y-4'}>
      {showLegend ? (
        <legend className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#90795e]">
          configurações do pulso
        </legend>
      ) : null}

      <label className={labelClass}>
        Duração
        <select
          value={durationHours == null ? '' : durationHours}
          onChange={(event) =>
            onChange({
              durationHours: event.target.value === '' ? null : Number(event.target.value),
            })
          }
          className={fieldClass}
        >
          <option value="">Sem duração definida</option>
          {PULSO_DURATIONS.map((hours) => (
            <option key={hours} value={hours}>
              {durationLabel(hours)}
            </option>
          ))}
        </select>
      </label>

      <div className={labelClass}>
        Público da publicação
        <div className={compact ? 'mt-1.5 space-y-1.5' : 'mt-2 space-y-2'}>
          <label className="flex items-start gap-2 text-sm font-normal text-[#5a4b3f]">
            <input
              type="radio"
              name={`pulso-audience-${formId}`}
              checked={includeInner}
              onChange={() => onChange({ includeInner: true })}
              className="mt-1"
            />
            <span>Mandar para todos os círculos menores</span>
          </label>
          <label className="flex items-start gap-2 text-sm font-normal text-[#5a4b3f]">
            <input
              type="radio"
              name={`pulso-audience-${formId}`}
              checked={!includeInner}
              onChange={() => onChange({ includeInner: false })}
              className="mt-1"
            />
            <span>Mandar para círculo específico</span>
          </label>
        </div>
      </div>

      <label className={labelClass}>
        {includeInner ? 'Até o círculo' : 'Somente o círculo'}
        <select
          value={circleId}
          onChange={(event) => onChange({ circleId: event.target.value })}
          className={fieldClass}
        >
          {circles.map((circle) => (
            <option key={circle.id} value={circle.id}>
              {circle.label}
            </option>
          ))}
        </select>
      </label>
    </fieldset>
  )
}
