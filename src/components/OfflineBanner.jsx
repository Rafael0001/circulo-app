import { useOnlineStatus } from '../hooks/useOnlineStatus'

export default function OfflineBanner() {
  const online = useOnlineStatus()

  if (online) return null

  return (
    <div
      className="pointer-events-none safe-x fixed inset-x-0 top-0 z-[60] border-b border-[#ead0b8] bg-[#fff4e8]/95 px-4 py-2.5 text-center text-sm text-[#6b543f] shadow-[0_8px_20px_rgba(120,80,40,0.08)] backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      Sem conexão. Você ainda pode abrir o Círculo, mas pulsos, amigos e login precisam da internet.
    </div>
  )
}
