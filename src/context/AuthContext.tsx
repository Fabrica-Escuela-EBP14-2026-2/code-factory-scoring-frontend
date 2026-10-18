import { createContext, useContext, useState, type ReactNode } from "react"

export type UserRole = "ADMINISTRADOR" | "ANALISTA"

export type AuthUser = {
  email: string
  role: UserRole
}

type LoginResponse = {
  token: string
  tipoToken: string
  expiraEn: number
  email: string
  rol: UserRole
}

type AuthSession = {
  token: string
  tokenType: string
  expiresIn: number
  expiresAt?: number
  mode: "api" | "mock"
  user: AuthUser
}

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  authMode: "api" | "mock" | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const STORAGE_KEY = "credit-risk-auth"
const AuthContext = createContext<AuthContextValue | null>(null)
const MOCK_ACCOUNTS = [
  {
    email: "admin@score.local",
    password: "Admin123*",
    role: "ADMINISTRADOR" as const,
  },
  {
    email: "analista@score.local",
    password: "Analista123*",
    role: "ANALISTA" as const,
  },
]

function isUserRole(value: unknown): value is UserRole {
  return value === "ADMINISTRADOR" || value === "ANALISTA"
}

function readStoredSession(): AuthSession | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const session = JSON.parse(stored) as AuthSession
    if (
      !session.token ||
      !session.user?.email ||
      !isUserRole(session.user.role) ||
      (session.mode !== "api" && session.mode !== "mock")
    ) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    if (
      session.mode === "api" &&
      (typeof session.expiresAt !== "number" || Date.now() > session.expiresAt)
    ) {
      console.warn("Sesión expirada")
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return session
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

async function readErrorMessage(response: Response) {
  const body = await response.json().catch(() => null)
  if (body && typeof body === "object") {
    const detail = "detail" in body ? body.detail : null
    const message = "message" in body ? body.message : null
    if (typeof detail === "string") return detail
    if (typeof message === "string") return message
  }
  return "No fue posible iniciar sesión. Verifique sus credenciales."
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(readStoredSession)

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    const mockAccount = MOCK_ACCOUNTS.find(
      (account) =>
        account.email === normalizedEmail && account.password === password,
    )

    if (mockAccount) {
      const mockSession: AuthSession = {
        token: `mock-${mockAccount.role.toLowerCase()}-${Date.now()}`,
        tokenType: "Bearer",
        expiresIn: 0,
        mode: "mock",
        user: { email: mockAccount.email, role: mockAccount.role },
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockSession))
      setSession(mockSession)
      return
    }

    const apiUrl = import.meta.env.VITE_API_URL
    if (!apiUrl) {
      throw new Error(
        "Backend no configurado. Para usar el modo mock, ingrese una de las cuentas semilla.",
      )
    }

    let response: Response
    try {
      response = await fetch(`${apiUrl.replace(/\/+$/, "")}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail, password }),
      })
    } catch {
      throw new Error(
        "No se pudo conectar con el backend. Use las credenciales semilla para entrar en modo simulación.",
      )
    }

    if (!response.ok) throw new Error(await readErrorMessage(response))

    const result = (await response.json()) as LoginResponse
    if (!result.token || !result.email || !isUserRole(result.rol)) {
      throw new Error("El backend devolvió una respuesta de acceso inválida.")
    }

    const nextSession: AuthSession = {
      token: result.token,
      tokenType: result.tipoToken || "Bearer",
      expiresIn: result.expiraEn,
      expiresAt: Date.now() + result.expiraEn,
      mode: "api",
      user: { email: result.email, role: result.rol },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setSession(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        token: session?.token ?? null,
        isAuthenticated: Boolean(session),
        authMode: session?.mode ?? null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider.")
  return context
}