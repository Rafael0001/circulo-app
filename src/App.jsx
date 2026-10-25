import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { FriendsProvider } from './hooks/useFriends'
import { PulsosProvider } from './hooks/usePulsos'
import Home from './pages/Home'
import Login from './pages/Login'
import Cadastro from './pages/Cadastro'
import AuthCallback from './pages/AuthCallback'
import AdicionarAmigo from './pages/AdicionarAmigo'
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

  if (loading) {
    return <LoadingScreen />
  }

  return user ? children : <Navigate to="/login" replace />
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  return user ? <Navigate to="/" replace /> : children
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
