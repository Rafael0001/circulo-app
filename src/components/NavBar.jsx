import { Home, Plus, User, Sparkles } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Círculo', to: '/', icon: Home },
  { label: 'Amigos', to: '/adicionar-amigo', icon: Plus },
  { label: 'Pulso', to: '/criar-pulso', icon: Sparkles },
  { label: 'Perfil', to: '/perfil', icon: User },
]

export default function NavBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-md items-center justify-around border-t border-[#eadbcb] bg-[#fffaf4]/90 px-3 py-3 backdrop-blur-sm">
      {navItems.map(({ label, to, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 rounded-full px-3 py-2 text-[10px] font-medium transition ${
              isActive ? 'text-[#8a5e3b]' : 'text-[#8a7a6d]'
            }`
          }
        >
          <Icon size={18} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
