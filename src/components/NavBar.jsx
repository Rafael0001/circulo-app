import { Plus, User, Sparkles } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import BrandMark from './ui/BrandMark'

const navItems = [
  { label: 'Círculo', to: '/', brand: true },
  { label: 'Amigos', to: '/adicionar-amigo', icon: Plus },
  { label: 'Pulso', to: '/criar-pulso', icon: Sparkles },
  { label: 'Perfil', to: '/perfil', icon: User },
]

export default function NavBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-md items-center justify-around border-t border-ring-sand/30 bg-snow/90 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
      {navItems.map(({ label, to, icon: Icon, brand }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            [
              'flex min-h-11 min-w-11 flex-col items-center gap-1 rounded-pill px-3 py-2 text-micro font-medium transition-[color,transform] duration-[var(--circulo-motion-fast)]',
              isActive ? '-translate-y-0.5 text-core' : 'text-ink-muted',
            ].join(' ')
          }
        >
          {brand ? (
            <BrandMark variant="pulsar" size={18} showLabel={false} className="shadow-none" label="Círculo" />
          ) : (
            <Icon size={18} />
          )}
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
