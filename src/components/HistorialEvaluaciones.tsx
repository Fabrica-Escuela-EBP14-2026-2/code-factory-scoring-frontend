import { Fragment, useEffect, useState, type FormEvent } from "react"
import { useAuth } from "../context/AuthContext"
import {
  ApiError,
  consultarHistorialEvaluaciones,
  type HistorialEvaluacionResponse,
} from "../services/api"

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== "number") return "Sin dato"
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  })
}

function riskBadgeClass(level: string) {
  const normalized = level.toLocaleLowerCase()
  if (normalized.includes("bajo")) return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (normalized.includes("medio")) return "border-amber-200 bg-amber-50 text-amber-800"
  if (normalized.includes("alto")) return "border-red-200 bg-red-50 text-red-800"
  return "border-slate-200 bg-slate-100 text-slate-700"
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.detail
  if (error instanceof Error) return error.message
  return "No fue posible consultar el historial."
}

export default function HistorialEvaluaciones({
  solicitanteId,
}: {
  solicitanteId?: number
}) {
  const { token } = useAuth()
  const [idInput, setIdInput] = useState(
    solicitanteId === undefined ? "" : String(solicitanteId),
  )
  const [requestedId, setRequestedId] = useState<number | null>(
    solicitanteId ?? null,
  )
  const [refreshKey, setRefreshKey] = useState(0)
  const [evaluaciones, setEvaluaciones] = useState<HistorialEvaluacionResponse[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasQueried, setHasQueried] = useState(false)
  const [error, setError] = useState("")
  const [inputError, setInputError] = useState("")

  useEffect(() => {
    if (solicitanteId === undefined) return
    setIdInput(String(solicitanteId))
    setRequestedId(solicitanteId)
  }, [solicitanteId])

  useEffect(() => {
    if (requestedId === null) return
    if (!token) {
      setError("La sesión no contiene un token válido para consultar el historial.")
      setHasQueried(true)
      return
    }

    let active = true
    setLoading(true)
    setHasQueried(true)
    setError("")
    setEvaluaciones([])
    setExpandedId(null)

    void consultarHistorialEvaluaciones(requestedId, token)
      .then((result) => {
        if (!active) return
        const chronological = [...result].sort((left, right) => {
          const dateDifference =
            new Date(right.fechaCalculo).getTime() -
            new Date(left.fechaCalculo).getTime()
          return dateDifference || right.id - left.id
        })
        setEvaluaciones(chronological)
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
  }, [requestedId, refreshKey, token])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsedId = Number(idInput)
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      setInputError("Ingrese un ID de solicitante válido.")
      return
    }
    setInputError("")
    setRequestedId(parsedId)
    setRefreshKey((current) => current + 1)
  }

  return (
    <section className="space-y-6" aria-labelledby="history-title">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">HU12 · Scoring</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950" id="history-title">
          Historial de evaluaciones
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Consulte las evaluaciones registradas para un solicitante y revise los datos usados en cada cálculo.
        </p>
      </header>

      <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
        <label className="block w-full max-w-xs space-y-2 text-sm font-semibold text-slate-700">
          ID del solicitante
          <input
            aria-describedby={inputError ? "history-id-error" : undefined}
            aria-invalid={Boolean(inputError)}
            className={`h-11 w-full border bg-white px-3 font-normal text-slate-950 outline-none focus:ring-2 ${inputError ? "border-red-600 focus:ring-red-600/15" : "border-slate-300 focus:border-blue-700 focus:ring-blue-700/15"}`}
            min="1"
            onChange={(event) => {
              setIdInput(event.target.value)
              setInputError("")
            }}
            placeholder="Ej. 42"
            type="number"
            value={idInput}
          />
        </label>
        <button
          className="h-11 bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={loading}
          type="submit"
        >
          {loading ? "Consultando..." : "Consultar historial"}
        </button>
        {inputError && (
          <p className="w-full text-sm text-red-700" id="history-id-error" role="alert">
            {inputError}
          </p>
        )}
      </form>

      {loading && (
        <p className="border-l-4 border-blue-700 bg-blue-50 px-4 py-3 text-sm text-blue-900" role="status" aria-live="polite">
          Consultando las evaluaciones del solicitante {requestedId}…
        </p>
      )}

      {error && (
        <div className="border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}

      {hasQueried && !loading && !error && evaluaciones.length === 0 && (
        <p className="border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-600">
          El solicitante no registra evaluaciones de scoring en el historial
        </p>
      )}

      {evaluaciones.length > 0 && (
        <div className="overflow-x-auto border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold" scope="col">Fecha y hora</th>
                <th className="px-4 py-3 font-semibold" scope="col">Puntaje</th>
                <th className="px-4 py-3 font-semibold" scope="col">Nivel de riesgo</th>
                <th className="px-4 py-3 font-semibold" scope="col">Evaluador</th>
                <th className="px-4 py-3 font-semibold text-right" scope="col">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {evaluaciones.map((evaluation) => {
                const expanded = expandedId === evaluation.id
                const detailId = `history-detail-${evaluation.id}`
                return (
                  <Fragment key={evaluation.id}>
                    <tr className="align-middle">
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">{formatDate(evaluation.fechaCalculo)}</td>
                      <td className="px-4 py-4 font-semibold tabular-nums text-slate-950">{evaluation.puntaje}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex border px-2.5 py-1 text-xs font-semibold ${riskBadgeClass(evaluation.nivel)}`}>
                          Riesgo {evaluation.nivel}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{evaluation.evaluadorEmail || "No disponible"}</td>
                      <td className="px-4 py-4 text-right">
                        <button
                          aria-controls={detailId}
                          aria-expanded={expanded}
                          className="border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-700 hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                          onClick={() => setExpandedId(expanded ? null : evaluation.id)}
                          type="button"
                        >
                          {expanded ? "Ocultar detalle" : "Ver detalle"}
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td className="bg-slate-50 px-4 py-5" colSpan={5} id={detailId}>
                          <section className="space-y-5" aria-label={`Detalle de evaluación ${evaluation.id}`}>
                            <dl className="grid gap-4 sm:grid-cols-3">
                              <div>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ingresos</dt>
                                <dd className="mt-1 font-semibold tabular-nums text-slate-900">{formatCurrency(evaluation.detalle.ingresos)}</dd>
                              </div>
                              <div>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Egresos</dt>
                                <dd className="mt-1 font-semibold tabular-nums text-slate-900">{formatCurrency(evaluation.detalle.egresos)}</dd>
                              </div>
                              <div>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ingreso neto disponible</dt>
                                <dd className="mt-1 font-semibold tabular-nums text-slate-900">{formatCurrency(evaluation.detalle.ingresoNetoDisponible)}</dd>
                              </div>
                            </dl>
                            <div>
                              <h3 className="mb-2 text-sm font-semibold text-slate-900">Variables evaluadas</h3>
                              {evaluation.detalle.variables.length === 0 ? (
                                <p className="text-sm text-slate-600">No hay variables registradas para esta evaluación.</p>
                              ) : (
                                <div className="overflow-x-auto border border-slate-200 bg-white">
                                  <table className="w-full min-w-[420px] text-left text-sm">
                                    <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
                                      <tr>
                                        <th className="px-3 py-2 font-semibold" scope="col">Variable</th>
                                        <th className="px-3 py-2 font-semibold" scope="col">Valor</th>
                                        <th className="px-3 py-2 font-semibold" scope="col">Peso</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                      {evaluation.detalle.variables.map((variable) => (
                                        <tr key={`${evaluation.id}-${variable.variableId}`}>
                                          <td className="px-3 py-2 text-slate-800">{variable.nombre}</td>
                                          <td className="px-3 py-2 tabular-nums text-slate-700">{variable.valor ?? "Sin dato"}</td>
                                          <td className="px-3 py-2 tabular-nums text-slate-700">{variable.peso}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </section>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
