import { AuthProvider, useAuth } from "./context/AuthContext"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import ProtectedRoute from "./components/ProtectedRoute"
import Dashboard from "./pages/Dashboard"
import Login from "./pages/Login"

const ROLES_PERMITIDOS = ["ADMINISTRADOR", "ANALISTA"] as const
const SOLO_ADMINISTRADOR = ["ADMINISTRADOR"] as const

function RootRedirect() {
  const { isAuthenticated } = useAuth()
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={[...ROLES_PERMITIDOS]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/variables"
            element={
              <ProtectedRoute allowedRoles={[...SOLO_ADMINISTRADOR]}>
                <Dashboard initialAdminView="variables" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/formula"
            element={
              <ProtectedRoute allowedRoles={[...SOLO_ADMINISTRADOR]}>
                <Dashboard initialAdminView="formula" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/rangos"
            element={
              <ProtectedRoute allowedRoles={[...SOLO_ADMINISTRADOR]}>
                <Dashboard initialAdminView="ranges" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute allowedRoles={[...SOLO_ADMINISTRADOR]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
