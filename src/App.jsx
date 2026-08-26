import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { FriendsProvider } from './hooks/useFriends'
import { PulsosProvider } from './hooks/usePulsos'
import Home from './pages/Home'
import Login from './pages/Login'
import Cadastro from './pages/Cadastro'
import AdicionarAmigo from './pages/AdicionarAmigo'
import CriarPulso from './pages/CriarPulso'
import Perfil from './pages/Perfil'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f4ee] text-sm font-medium uppercase tracking-[0.2em] text-[#7c6a5f]">
        Carregando círculo...
      </div>
    )
  }

  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <FriendsProvider>
      <PulsosProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
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
  )
}
