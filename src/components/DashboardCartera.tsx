import { useEffect, useState, type FormEvent } from "react"
import { useAuth } from "../context/AuthContext"
import {
  exportarReporteCartera,
  obtenerDistribucionRiesgo,
  type DistribucionRiesgoItem,
  type DistribucionRiesgoResponse,
  type FiltroFechaParams,
} from "../services/reportesService"

const NIVELES = [
  {
    nivel: "Bajo",
    label: "Riesgo bajo",
    icon: "↓",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    barClassName: "bg-emerald-600",
  },
  {
    nivel: "Medio",
    label: "Riesgo medio",
    icon: "↔",
    className: "border-amber-200 bg-amber-50 text-amber-800",
    barClassName: "bg-amber-500",
  },
  {
    nivel: "Alto",
    label: "Riesgo alto",
    icon: "↑",
    className: "border-red-200 bg-red-50 text-red-800",
    barClassName: "bg-red-600",
  },
] as const

function normalizeLevel(level: string) {
  return level.trim().toLocaleLowerCase()
}

function findLevel(
  distribution: DistribucionRiesgoItem[],
  level: string,
) {
  return distribution.find((item) => normalizeLevel(item.nivel) === normalizeLevel(level))
}

function percentageLabel(value: number) {
  return `${value.toLocaleString("es-CO", { maximumFractionDigits: 1 })}%`
}

function formatCount(value: number) {
  return value.toLocaleString("es-CO")
}

function toFilters(values: { fechaInicio: string; fechaFin: string }): FiltroFechaParams {
  return {
    ...(values.fechaInicio ? { fechaInicio: values.fechaInicio } : {}),
    ...(values.fechaFin ? { fechaFin: values.fechaFin } : {}),
  }
}

export default function DashboardCartera() {
  const { token } = useAuth()
  const [draftFilters, setDraftFilters] = useState({ fechaInicio: "", fechaFin: "" })
  const [activeFilters, setActiveFilters] = useState<FiltroFechaParams>({})
  const [distribution, setDistribution] =
    useState<DistribucionRiesgoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState("")
  const [exportError, setExportError] = useState("")
  const [filterError, setFilterError] = useState("")

  useEffect(() => {
    if (!token) {
      setError("La sesión no contiene un token válido para consultar el dashboard.")
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError("")
    setDistribution(null)

    void obtenerDistribucionRiesgo(activeFilters, token)
      .then((result) => {
        if (active) setDistribution(result)
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "No fue posible obtener la distribución de riesgo.",
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [activeFilters, token])

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (
      draftFilters.fechaInicio &&
      draftFilters.fechaFin &&
      draftFilters.fechaInicio > draftFilters.fechaFin
    ) {
      setFilterError("La fecha inicial no puede ser posterior a la fecha final.")
      return
    }
    setFilterError("")
    setActiveFilters(toFilters(draftFilters))
  }

  const clearFilters = () => {
    setDraftFilters({ fechaInicio: "", fechaFin: "" })
    setFilterError("")
    setActiveFilters({})
  }

  const exportReport = async () => {
    if (!token || !distribution) return
    setExporting(true)
    setExportError("")
    try {
      await exportarReporteCartera(activeFilters, token)
    } catch (requestError) {
      setExportError(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible exportar el reporte.",
      )
    } finally {
      setExporting(false)
    }
  }

  const totalSolicitantes = distribution?.totalSolicitantes ?? 0
  const riskPercent = (level: string) =>
    findLevel(distribution?.distribucion ?? [], level)?.porcentaje ?? 0
  const exportDisabled = loading || exporting

  return (
    <section className="space-y-7" aria-labelledby="portfolio-title">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">HU13 · HU14</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950" id="portfolio-title">
            Distribución de riesgo de cartera
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Resumen de evaluaciones de scoring agrupadas por nivel de riesgo.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button
            className="flex h-11 items-center gap-2 bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={exportDisabled}
            onClick={() => void exportReport()}
            type="button"
          >
            <span aria-hidden="true">⇩</span>
            {exporting ? "Preparando reporte..." : "Exportar Reporte"}
          </button>
        </div>
      </header>

      <form
        className="flex flex-wrap items-end gap-4 border-b border-slate-200 pb-6"
        onSubmit={applyFilters}
      >
        <label className="block w-full max-w-[220px] space-y-2 text-sm font-semibold text-slate-700">
          Fecha inicio
          <input
            className="h-11 w-full border border-slate-300 bg-white px-3 font-normal text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
            max={draftFilters.fechaFin || undefined}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                fechaInicio: event.target.value,
              }))
            }
            type="date"
            value={draftFilters.fechaInicio}
          />
        </label>
        <label className="block w-full max-w-[220px] space-y-2 text-sm font-semibold text-slate-700">
          Fecha fin
          <input
            className="h-11 w-full border border-slate-300 bg-white px-3 font-normal text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
            min={draftFilters.fechaInicio || undefined}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                fechaFin: event.target.value,
              }))
            }
            type="date"
            value={draftFilters.fechaFin}
          />
        </label>
        <button
          className="h-11 bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={loading}
          type="submit"
        >
          Aplicar Filtro
        </button>
        <button
          className="h-11 border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading && !distribution}
          onClick={clearFilters}
          type="button"
        >
          Limpiar
        </button>
        {filterError && (
          <p className="w-full text-sm text-red-700" role="alert">
            {filterError}
          </p>
        )}
      </form>

      {loading && (
        <p className="border-l-4 border-blue-700 bg-blue-50 px-4 py-3 text-sm text-blue-900" role="status" aria-live="polite">
          Cargando distribución de riesgo…
        </p>
      )}
      {error && (
        <div className="border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}
      {exportError && (
        <div className="border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {exportError}
        </div>
      )}

      {distribution && !loading && !error && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-600">Total solicitantes</p>
                <span aria-hidden="true" className="text-lg font-bold text-blue-700">Σ</span>
              </div>
              <p className="mt-4 text-3xl font-bold tabular-nums text-slate-950">
                {formatCount(totalSolicitantes)}
              </p>
            </article>
            {NIVELES.map((level) => (
              <article className="border border-slate-200 bg-white p-5" key={level.nivel}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-600">{level.label}</p>
                  <span
                    aria-hidden="true"
                    className={`flex size-8 items-center justify-center border text-lg font-bold ${level.className}`}
                  >
                    {level.icon}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-bold tabular-nums text-slate-950">
                  {percentageLabel(riskPercent(level.nivel))}
                </p>
              </article>
            ))}
          </div>

          <section className="border-t border-slate-200 pt-6" aria-labelledby="distribution-title">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-950" id="distribution-title">
                  Cartera por nivel de riesgo
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Distribución de las evaluaciones incluidas en el periodo seleccionado.
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-slate-700">
                {formatCount(totalSolicitantes)} solicitantes
              </p>
            </div>

            {totalSolicitantes === 0 ? (
              <p className="mt-6 border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-600">
                {distribution.mensaje}
              </p>
            ) : (
              <div className="mt-6 max-w-3xl space-y-5" role="img" aria-label="Barras porcentuales de evaluaciones por nivel de riesgo">
                {NIVELES.map((level) => {
                  const item = findLevel(distribution.distribucion, level.nivel)
                  const percentage = Math.max(0, Math.min(100, item?.porcentaje ?? 0))
                  return (
                    <div className="space-y-2" key={level.nivel}>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={`flex size-7 items-center justify-center border text-sm font-bold ${level.className}`}
                          >
                            {level.icon}
                          </span>
                          <span className="font-semibold text-slate-900">{level.label}</span>
                        </div>
                        <span className="tabular-nums text-slate-700">
                          {formatCount(item?.total ?? 0)} · {percentageLabel(item?.porcentaje ?? 0)}
                        </span>
                      </div>
                      <div className="h-3 w-full bg-slate-100" aria-hidden="true">
                        <div
                          className={`h-3 transition-[width] duration-300 ${level.barClassName}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  )
}
