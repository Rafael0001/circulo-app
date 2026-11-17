import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function PasswordField({
  label = 'Senha',
  value,
  onChange,
  autoComplete = 'current-password',
  placeholder = '••••••••',
  required = true,
  minLength = 6,
}) {
  const [visible, setVisible] = useState(false)

  return (
    <label className="block text-sm text-[#5a4b3f]">
      {label}
      <span className="relative mt-1 block">
        <input
          type={visible ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          className="w-full rounded-2xl border border-[#eddcc7] bg-[#fffaf4] px-3 py-2.5 pr-12 outline-none transition focus:border-[#d4a86d]"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#8a7464] transition hover:bg-[#f4eadc] hover:text-[#5a4b3f]"
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
        </button>
      </span>
    </label>
  )
}
