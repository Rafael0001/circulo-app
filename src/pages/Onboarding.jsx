import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ONBOARDING_SLIDES,
  markOnboardingSeen,
  onboardingContinuePath,
} from '../lib/onboarding'

export default function Onboarding() {
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep] = useState(0)
  const [touchX, setTouchX] = useState(null)
  const [brokenImage, setBrokenImage] = useState({})
  const slide = ONBOARDING_SLIDES[step]
  const isLast = step === ONBOARDING_SLIDES.length - 1

  const finish = () => {
    markOnboardingSeen()
    navigate(onboardingContinuePath(location.search), { replace: true })
  }

  const goNext = () => {
    if (isLast) finish()
    else setStep((current) => current + 1)
  }

  const goPrev = () => {
    setStep((current) => Math.max(0, current - 1))
  }

  const onTouchStart = (event) => {
    setTouchX(event.changedTouches[0]?.clientX ?? null)
  }

  const onTouchEnd = (event) => {
    if (touchX == null) return
    const delta = (event.changedTouches[0]?.clientX ?? touchX) - touchX
    setTouchX(null)
    if (delta < -40) goNext()
    if (delta > 40) goPrev()
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#90795e]">círculo</p>
        <button type="button" onClick={finish} className="text-sm text-[#8d7c6b]">
          Pular
        </button>
      </div>

      <div className="flex flex-1 flex-col" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="flex flex-1 items-center justify-center">
          {brokenImage[slide.image] ? (
            <div className="flex min-h-[420px] w-full items-center justify-center rounded-[32px] bg-[#fff6ec]">
              <p className="px-6 text-center text-lg font-semibold text-[#2e2926]">{slide.title}</p>
            </div>
          ) : (
            <img
              src={slide.image}
              alt={slide.title}
              className="max-h-[min(72vh,640px)] w-full rounded-[28px] object-contain"
              onError={() => setBrokenImage((current) => ({ ...current, [slide.image]: true }))}
            />
          )}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          {ONBOARDING_SLIDES.map((item, index) => (
            <button
              key={item.image}
              type="button"
              onClick={() => setStep(index)}
              className={`h-2 rounded-full transition ${
                index === step ? 'w-6 bg-[#c4a06a]' : 'w-2 bg-[#eadfce]'
              }`}
              aria-label={`Ir para o passo ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        {step > 0 ? (
          <button
            type="button"
            onClick={goPrev}
            className="flex-1 rounded-full border border-[#eadfce] bg-white px-4 py-3 text-sm font-medium text-[#6b543f]"
          >
            Voltar
          </button>
        ) : null}
        <button
          type="button"
          onClick={goNext}
          className="flex-[2] rounded-full bg-[#2a231f] px-4 py-3 text-sm font-medium text-white"
        >
          {isLast ? 'Entrar no Círculo' : 'Continuar'}
        </button>
      </div>
    </div>
  )
}
