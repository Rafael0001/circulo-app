import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { FriendsProvider } from './hooks/useFriends'
import { PulsosProvider } from './hooks/usePulsos'
import { nextFromSearch, safeInvitePath } from './lib/authRedirect'
import Home from './pages/Home'
import Login from './pages/Login'
import Cadastro from './pages/Cadastro'
import AuthCallback from './pages/AuthCallback'
import AdicionarAmigo from './pages/AdicionarAmigo'
import Convite from './pages/Convite'
import CriarPulso from './pages/CriarPulso'
import Perfil from './pages/Perfil'

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f4ee] text-sm font-medium uppercase tracking-[0.2em] text-[#7c6a5f]">
      Carregando círculo...
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingScreen />
  }

  if (user) return children

  const next = safeInvitePath(location.pathname) ? location.pathname : ''
  return <Navigate to={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} replace />
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingScreen />
  }

  const next = nextFromSearch(location.search) || '/'
  return user ? <Navigate to={next} replace /> : children
}

export default function App() {
  return (
    <AuthProvider>
      <FriendsProvider>
        <PulsosProvider>
          <BrowserRouter>
            <Routes>
              <Route
                path="/login"
                element={
                  <GuestRoute>
                    <Login />
                  </GuestRoute>
                }
              />
              <Route
                path="/cadastro"
                element={
                  <GuestRoute>
                    <Cadastro />
                  </GuestRoute>
                }
              />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/convite/:token" element={<Convite />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/adicionar-amigo"
                element={
                  <ProtectedRoute>
                    <AdicionarAmigo />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/criar-pulso"
                element={
                  <ProtectedRoute>
                    <CriarPulso />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/perfil"
                element={
                  <ProtectedRoute>
                    <Perfil />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </PulsosProvider>
      </FriendsProvider>
    </AuthProvider>
  )
}
