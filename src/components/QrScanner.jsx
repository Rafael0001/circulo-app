import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QrScanner({ onDecode, onCancel }) {
  const [error, setError] = useState('')
  const startedRef = useRef(false)
  const scannerRef = useRef(null)
  const handledRef = useRef(false)
  const onDecodeRef = useRef(onDecode)
  onDecodeRef.current = onDecode

  useEffect(() => {
    const scanner = new Html5Qrcode('circulo-qr-reader')
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 220, height: 220 } },
        (decoded) => {
          if (handledRef.current) return
          handledRef.current = true
          onDecodeRef.current(decoded)
        },
      )
      .then(() => {
        startedRef.current = true
      })
      .catch(() => {
        setError('Não foi possível abrir a câmera. Permita o acesso e tente de novo.')
      })

    return () => {
      const stop = async () => {
        try {
          if (startedRef.current) {
            await scanner.stop()
            await scanner.clear()
          }
        } catch {
          // already stopped
        }
      }
      stop()
    }
  }, [])

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-[24px] border border-[#eadfce] bg-[#1f1a17]">
        <div id="circulo-qr-reader" className="min-h-[280px] overflow-hidden" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-44 w-44 rounded-3xl border-2 border-white/80 shadow-[0_0_0_80px_rgba(0,0,0,0.28)]" />
        </div>
      </div>
      <p className="text-center text-xs text-[#8d7c6b]">Enquadre o QR Code de convite</p>
      {error ? <p className="text-center text-sm text-[#a63f35]">{error}</p> : null}
      <button
        type="button"
        onClick={onCancel}
        className="w-full rounded-full border border-[#eadfce] bg-white px-4 py-3 text-sm text-[#6b543f]"
      >
        Cancelar leitura
      </button>
    </div>
  )
}
