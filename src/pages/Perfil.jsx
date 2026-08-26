import { useState } from 'react'
import NavBar from '../components/NavBar'

const STORAGE_KEY = 'circulo_profile'

const defaultProfile = {
  name: 'Ana',
  bio: 'Amo encontros espontâneos, café e conversar de verdade.',
  interests: ['café', 'viagens', 'música', 'livros'],
}

const interestOptions = ['café', 'viagens', 'música', 'livros', 'natureza', 'fotografia', 'arte', 'saúde']

function readProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultProfile
    const parsed = JSON.parse(raw)
    return { ...defaultProfile, ...parsed }
  } catch {
    return defaultProfile
  }
}

export default function Perfil() {
  const [profile, setProfile] = useState(readProfile)
  const [draft, setDraft] = useState(profile)
  const [saved, setSaved] = useState(false)

  const toggleInterest = (interest) => {
    const updated = draft.interests.includes(interest)
      ? draft.interests.filter((item) => item !== interest)
      : [...draft.interests, interest]

    setDraft((current) => ({ ...current, interests: updated }))
  }

  const handleSave = () => {
    setProfile(draft)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    } catch {
      // ignore
    }
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1400)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-28 pt-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#90795e]">perfil</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#2e2926]">Você</h1>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-full bg-[#f3e6d3] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f5b3d]"
        >
          {saved ? 'salvo' : 'salvar'}
        </button>
      </header>

      <div className="rounded-[30px] border border-[#f0e6d8] bg-white/85 p-5 shadow-[0_14px_36px_rgba(166,139,107,0.08)]">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f4d9b5] text-xl font-semibold text-[#40382f]">
            {profile.name.slice(0, 2).toUpperCase() || 'VO'}
          </div>
          <div>
            <p className="text-lg font-semibold text-[#2a231f]">{profile.name}</p>
            <p className="text-sm text-[#7d6d62]">@{profile.name.toLowerCase().replace(/\s+/g, '')}</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block text-sm text-[#5a4b3f]">
            Nome
            <input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              className="mt-1 w-full rounded-2xl border border-[#eddcc7] bg-[#fffaf4] px-3 py-2.5 outline-none focus:border-[#d4a86d]"
            />
          </label>

          <label className="block text-sm text-[#5a4b3f]">
            Bio
            <textarea
              value={draft.bio}
              onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-[#eddcc7] bg-[#fffaf4] px-3 py-2.5 outline-none focus:border-[#d4a86d]"
            />
          </label>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9a8e80]">interesses</p>
          <div className="flex flex-wrap gap-2">
            {interestOptions.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                className={`rounded-full border px-2.5 py-1.5 text-xs transition ${
                  draft.interests.includes(interest)
                    ? 'border-[#d9b57a] bg-[#f3e7d1] text-[#6a4a2e]'
                    : 'border-[#eadfce] bg-[#fffaf4] text-[#5d5149]'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>
      </div>

      <NavBar />
    </div>
  )
}
