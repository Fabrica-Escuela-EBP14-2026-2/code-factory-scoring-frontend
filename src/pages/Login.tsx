import { useState, type FormEvent } from "react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)
    try {
      await login(email, password)
      const from = (
        location.state as { from?: { pathname?: string } } | null
      )?.from?.pathname
      navigate(from || "/dashboard", { replace: true })
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible iniciar sesión. Inténtelo de nuevo.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-12 text-slate-900">
      <section className="w-full max-w-md border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5 sm:p-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center bg-blue-700 text-lg font-bold text-white">
            CR
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
              Motor de Riesgo
            </p>
            <p className="text-sm text-slate-500">Sistema de control crediticio</p>
          </div>
        </div>

        <h1 className="text-2xl font-bold">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-slate-600">
          Acceda con su cuenta institucional para continuar.
        </p>

        <form className="mt-8 space-y-5" onSubmit={submit}>
          {error && (
            <p
              role="alert"
              className="border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {error}
            </p>
          )}
          <div className="space-y-2">
            <label className="block text-sm font-semibold" htmlFor="email">
              Correo electrónico
            </label>
            <input
              autoComplete="username"
              className="h-11 w-full border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold" htmlFor="password">
              Contraseña
            </label>
            <input
              autoComplete="current-password"
              className="h-11 w-full border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
              id="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>
          <button
            className="flex h-11 w-full items-center justify-center bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:bg-slate-400"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Validando acceso..." : "Entrar"}
          </button>
        </form>

        {import.meta.env.VITE_AUTH_MODE === "mock" && (
          <aside className="mt-8 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-600">
            <p className="font-semibold text-slate-800">Cuentas de simulación local</p>
            <p>Administrador: admin@score.local / Admin123*</p>
            <p>Analista: analista@score.local / Analista123*</p>
            <p className="mt-1 text-slate-500">No requieren conexión con el backend.</p>
          </aside>
        )}
      </section>
    </main>
  )
}