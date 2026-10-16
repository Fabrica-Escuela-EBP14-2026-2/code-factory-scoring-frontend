import { Navigate, useLocation } from "react-router-dom"
import { useAuth, type UserRole } from "../context/AuthContext"
import type { ReactNode } from "react"

type ProtectedRouteProps = {
  children: ReactNode
  allowedRoles?: UserRole[]
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <Navigate
        to="/dashboard"
        replace
        state={{ accessDenied: true, attemptedPath: location.pathname }}
      />
    )
  }

  return children
}