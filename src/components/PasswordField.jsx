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
          spellCheck={false}
          className="w-full rounded-2xl border border-[#eddcc7] bg-[#fffaf4] px-3 py-2.5 pr-12 outline-none transition focus:border-[#d4a86d] [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#6d5748] transition hover:bg-[#f4eadc] hover:text-[#2a231f]"
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          title={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
        </button>
      </span>
    </label>
  )
}
