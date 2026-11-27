import { Component } from 'react'

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Círculo crash:', error, info)
  }

  handleReload = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((reg) => reg.unregister()))
      }
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      }
    } catch {
      // ignore cleanup failures
    }
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f8f4ee] px-6 text-center">
        <p className="font-display text-xl font-semibold text-[#2e2926]">Algo deu errado</p>
        <p className="max-w-sm text-sm leading-6 text-[#7c6a5f]">
          O Círculo precisa recarregar para atualizar. Isso costuma acontecer depois de uma nova versão no celular.
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          className="rounded-full bg-[#f15a22] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Recarregar app
        </button>
      </div>
    )
  }
}
