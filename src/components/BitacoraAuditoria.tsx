import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import {
  ApiError,
  consultarBitacoraAuditoria,
  type AuditoriaResponse,
} from "../services/api"

function formatUtcDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const formatted = new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(date)
  return `${formatted} UTC`
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.detail
  if (error instanceof Error) return error.message
  return "No fue posible consultar la bitácora de auditoría."
}

function JsonValue({ value }: { value: Record<string, unknown> | null }) {
  if (value === null) {
    return <p className="text-sm italic text-slate-500">Sin valor registrado</p>
  }

  return (
    <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words bg-slate-950 p-3 text-xs leading-5 text-slate-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

export default function BitacoraAuditoria() {
  const { token, user } = useAuth()
  const [entries, setEntries] = useState<AuditoriaResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (user?.role !== "ADMINISTRADOR") return
    if (!token) {
      setError("La sesión no contiene un token válido para consultar la bitácora.")
      return
    }

    let active = true
    setLoading(true)
    setError("")

    void consultarBitacoraAuditoria(token)
      .then((result) => {
        if (!active) return
        const newestFirst = [...result].sort(
          (left, right) =>
            new Date(right.fechaUtc).getTime() - new Date(left.fechaUtc).getTime(),
        )
        setEntries(newestFirst)
      })
      .catch((requestError: unknown) => {
        if (active) setError(errorMessage(requestError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [refreshKey, token, user?.role])

  if (user?.role !== "ADMINISTRADOR") {
    return (
      <div className="border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
        No tiene permisos para consultar la bitácora de auditoría.
      </div>
    )
  }

  return (
    <section className="space-y-6" aria-labelledby="audit-title">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">HUS02 · Solo administradores</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950" id="audit-title">
            Bitácora de auditoría
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Registro de solo lectura de los cambios realizados en el sistema.
          </p>
        </div>
        <button
          className="h-10 border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-blue-700 hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          onClick={() => setRefreshKey((current) => current + 1)}
          type="button"
        >
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </header>

      {loading && (
        <p className="border-l-4 border-blue-700 bg-blue-50 px-4 py-3 text-sm text-blue-900" role="status" aria-live="polite">
          Cargando registros de auditoría…
        </p>
      )}

      {error && (
        <div className="border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <p className="border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-600">
          No hay registros de auditoría disponibles.
        </p>
      )}

      {entries.length > 0 && (
        <div className="overflow-x-auto border border-slate-200 bg-white">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold" scope="col">Fecha UTC</th>
                <th className="px-4 py-3 font-semibold" scope="col">Usuario responsable</th>
                <th className="px-4 py-3 font-semibold" scope="col">Módulo</th>
                <th className="px-4 py-3 font-semibold" scope="col">Acción</th>
                <th className="px-4 py-3 font-semibold" scope="col">Valores registrados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {entries.map((entry) => (
                <tr className="align-top" key={entry.id}>
                  <td className="whitespace-nowrap px-4 py-4 text-slate-700">{formatUtcDate(entry.fechaUtc)}</td>
                  <td className="max-w-56 break-words px-4 py-4 font-medium text-slate-900">{entry.usuario}</td>
                  <td className="px-4 py-4 text-slate-700">{entry.modulo}</td>
                  <td className="px-4 py-4 text-slate-700">{entry.accion}</td>
                  <td className="min-w-[420px] px-4 py-4">
                    <div className="grid gap-3 lg:grid-cols-2">
                      <section aria-label="Valor anterior">
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Valor anterior</h3>
                        <JsonValue value={entry.valorAnterior} />
                      </section>
                      <section aria-label="Valor nuevo">
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Valor nuevo</h3>
                        <JsonValue value={entry.valorNuevo} />
                      </section>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
