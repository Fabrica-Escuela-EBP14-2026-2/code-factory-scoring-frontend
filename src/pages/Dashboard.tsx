import { useEffect, useState, type FormEvent } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth, type UserRole } from "../context/AuthContext"
import RegistroWizard from "../components/RegistroWizard"
import { saveRiskRanges, saveScoringFormula } from "../utils/scoringConfig"

type DataType = "NUMERICO" | "PORCENTAJE" | "CATEGORICO"
type VariableStatus = "Activa" | "Inactiva"
type Variable = {
  id: number
  name: string
  category: string
  dataType: DataType
  weight: number
  status: VariableStatus
}
type AdminView = "overview" | "variables" | "formula" | "ranges"
type AnalystView = "solicitantes" | "simulacion"
type RiskLevel = "Bajo" | "Medio" | "Alto"
type RiskRange = { level: RiskLevel; min: string; max: string }

const DATA_TYPE_LABEL: Record<DataType, string> = {
  NUMERICO: "Numérico",
  PORCENTAJE: "Porcentaje",
  CATEGORICO: "Categórico",
}

const ROLE_LABEL: Record<UserRole, string> = {
  ADMINISTRADOR: "Administrador",
  ANALISTA: "Analista",
}

const INITIAL_VARIABLES: Variable[] = [
  { id: 1, name: "Historial de pago", category: "Comportamiento", dataType: "NUMERICO", weight: 35, status: "Activa" },
  { id: 2, name: "Capacidad de pago", category: "Financiera", dataType: "NUMERICO", weight: 30, status: "Activa" },
  { id: 3, name: "Estabilidad laboral", category: "Estabilidad", dataType: "CATEGORICO", weight: 35, status: "Activa" },
]

const INITIAL_RANGES: RiskRange[] = [
  { level: "Bajo", min: "701", max: "1000" },
  { level: "Medio", min: "301", max: "700" },
  { level: "Alto", min: "0", max: "300" },
]

function validateRiskRanges(ranges: RiskRange[]) {
  const fieldErrors: Record<string, string> = {}
  const issues: string[] = []
  const parsed = ranges.map((range) => {
    const min = Number(range.min)
    const max = Number(range.max)
    const validMin = range.min !== "" && Number.isInteger(min) && min >= 0 && min <= 1000
    const validMax = range.max !== "" && Number.isInteger(max) && max >= 0 && max <= 1000

    if (!validMin) fieldErrors[`${range.level}-min`] = "Ingrese un entero entre 0 y 1000."
    if (!validMax) fieldErrors[`${range.level}-max`] = "Ingrese un entero entre 0 y 1000."
    if (validMin && validMax && min > max) {
      fieldErrors[`${range.level}-min`] = "El mínimo no puede superar el máximo."
      fieldErrors[`${range.level}-max`] = "El máximo debe ser mayor o igual al mínimo."
      issues.push(`El rango ${range.level} tiene el mínimo por encima del máximo.`)
    }

    return { level: range.level, min, max, valid: validMin && validMax && min <= max }
  })

  if (parsed.every((range) => range.valid)) {
    const ordered = [...parsed].sort((left, right) => left.min - right.min)
    if (ordered[0].min > 0) {
      fieldErrors[`${ordered[0].level}-min`] = "La escala debe comenzar en 0."
      issues.push(`Hay un vacío entre 0 y ${ordered[0].min - 1}.`)
    }

    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1]
      const current = ordered[index]
      if (current.min <= previous.max) {
        fieldErrors[`${previous.level}-max`] = "Este límite se solapa con otro nivel."
        fieldErrors[`${current.level}-min`] = "Este límite se solapa con otro nivel."
        issues.push(`Hay un solapamiento entre los niveles ${previous.level} y ${current.level}.`)
      } else if (current.min > previous.max + 1) {
        fieldErrors[`${previous.level}-max`] = "Este límite deja un vacío en la escala."
        fieldErrors[`${current.level}-min`] = "Este límite deja un vacío en la escala."
        issues.push(`Hay un vacío entre ${previous.max + 1} y ${current.min - 1}.`)
      }
    }

    const last = ordered[ordered.length - 1]
    if (last.max < 1000) {
      fieldErrors[`${last.level}-max`] = "La escala debe terminar en 1000."
      issues.push(`Hay un vacío entre ${last.max + 1} y 1000.`)
    }
  }

  if (Object.keys(fieldErrors).length > 0 && issues.length === 0) {
    issues.push("Corrija los límites inválidos antes de guardar los rangos.")
  }

  return { fieldErrors, issues, valid: Object.keys(fieldErrors).length === 0 }
}

function ScoreSimulator() {
  const [income, setIncome] = useState("")
  const [expenses, setExpenses] = useState("")
  const [onTimePayments, setOnTimePayments] = useState("85")
  const [score, setScore] = useState<number | null>(null)

  const simulate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const monthlyIncome = Number(income)
    const monthlyExpenses = Number(expenses)
    const paymentHistory = Number(onTimePayments)
    if (
      !Number.isFinite(monthlyIncome) ||
      !Number.isFinite(monthlyExpenses) ||
      monthlyIncome <= 0 ||
      monthlyExpenses < 0 ||
      paymentHistory < 0 ||
      paymentHistory > 100
    ) {
      return
    }
    const paymentCapacity = Math.max(
      0,
      Math.min(1, (monthlyIncome - monthlyExpenses) / monthlyIncome),
    )
    setScore(
      Math.round(
        Math.max(300, Math.min(850, 300 + paymentHistory * 3.5 + paymentCapacity * 200)),
      ),
    )
  }

  return (
    <section className="max-w-3xl">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Simulación local</p>
        <h2 className="mt-2 text-2xl font-bold">Simulador de score crediticio</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Pruebe escenarios con información financiera y comportamiento de pago. El resultado es demostrativo y no consulta ni guarda información en el backend.
        </p>
      </div>
      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1fr)_220px]">
        <form className="space-y-5" onSubmit={simulate}>
          <label className="block space-y-2 text-sm font-semibold">
            Ingresos mensuales
            <input
              className="h-11 w-full border border-slate-300 bg-white px-3 font-normal outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
              min="1"
              onChange={(event) => setIncome(event.target.value)}
              required
              type="number"
              value={income}
            />
          </label>
          <label className="block space-y-2 text-sm font-semibold">
            Egresos mensuales
            <input
              className="h-11 w-full border border-slate-300 bg-white px-3 font-normal outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
              min="0"
              onChange={(event) => setExpenses(event.target.value)}
              required
              type="number"
              value={expenses}
            />
          </label>
          <label className="block space-y-2 text-sm font-semibold">
            Pagos realizados a tiempo (%)
            <input
              className="h-11 w-full border border-slate-300 bg-white px-3 font-normal outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
              max="100"
              min="0"
              onChange={(event) => setOnTimePayments(event.target.value)}
              required
              type="number"
              value={onTimePayments}
            />
          </label>
          <button className="h-11 bg-teal-800 px-5 text-sm font-semibold text-white hover:bg-teal-900" type="submit">
            Calcular score de prueba
          </button>
        </form>
        <div aria-live="polite" className="flex min-h-48 flex-col justify-center border-l-4 border-teal-700 bg-white px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Resultado estimado</p>
          <p className="mt-2 text-5xl font-bold tabular-nums text-slate-900">{score ?? "---"}</p>
          <p className="mt-2 text-sm text-slate-600">Escala ilustrativa: 300 a 850</p>
        </div>
      </div>
    </section>
  )
}

function AdminWorkspace({
  view,
  setView,
}: {
  view: AdminView
  setView: (view: AdminView) => void
}) {
  const [variables, setVariables] = useState(INITIAL_VARIABLES)
  const [name, setName] = useState("")
  const [category, setCategory] = useState("Financiera")
  const [dataType, setDataType] = useState<DataType>("NUMERICO")
  const [weight, setWeight] = useState("")
  const [saved, setSaved] = useState(false)
  const [ranges, setRanges] = useState(INITIAL_RANGES)
  const [rangesSaved, setRangesSaved] = useState(false)
  const activeVariables = variables.filter((variable) => variable.status === "Activa")
  const totalWeightUnits = activeVariables.reduce(
    (sum, variable) => sum + Math.round(variable.weight * 10000),
    0,
  )
  const totalWeight = totalWeightUnits / 10000
  const formulaComplete = totalWeightUnits === 1000000
  const totalWeightLabel = totalWeight.toLocaleString("es-CO", { maximumFractionDigits: 4 })
  const weightDifference = Math.abs(1000000 - totalWeightUnits) / 10000
  const weightDifferenceLabel = weightDifference.toLocaleString("es-CO", { maximumFractionDigits: 4 })
  const availableWeight = Math.max(0, 100 - totalWeight)
  const normalizedName = name.trim().toLocaleLowerCase()
  const duplicateName = Boolean(
    normalizedName &&
      variables.some((variable) => variable.name.trim().toLocaleLowerCase() === normalizedName),
  )
  const rangeValidation = validateRiskRanges(ranges)

  const addVariable = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const numericWeight = Number(weight)
    if (
      !name.trim() ||
      duplicateName ||
      weight.trim() === "" ||
      !Number.isFinite(numericWeight) ||
      numericWeight <= 0
    ) return
    setVariables((current) => [
      ...current,
      {
        id: Date.now(),
        name: name.trim(),
        category,
        dataType,
        weight: numericWeight,
        status: "Activa",
      },
    ])
    setName("")
    setWeight("")
    setDataType("NUMERICO")
    setSaved(false)
  }

  const toggleVariableStatus = (id: number) => {
    setVariables((current) => current.map((variable) =>
      variable.id === id
        ? { ...variable, status: variable.status === "Activa" ? "Inactiva" : "Activa" }
        : variable,
    ))
    setSaved(false)
  }

  const updateVariableWeight = (id: number, value: string) => {
    if (!value.trim()) return
    const nextWeight = Number(value)
    if (!Number.isFinite(nextWeight) || nextWeight <= 0) return
    setVariables((current) => current.map((variable) =>
      variable.id === id ? { ...variable, weight: nextWeight } : variable,
    ))
    setSaved(false)
  }

  const updateRange = (level: RiskLevel, bound: "min" | "max", value: string) => {
    setRanges((current) => current.map((range) =>
      range.level === level ? { ...range, [bound]: value } : range,
    ))
    setRangesSaved(false)
  }

  const persistFormula = () => {
    try {
      saveScoringFormula(
        activeVariables.map((variable) => ({
          id: variable.id,
          name: variable.name,
          dataType: variable.dataType,
          weight: variable.weight,
          status: "Activa" as const,
        })),
      )
      setSaved(true)
    } catch {
      setSaved(false)
    }
  }

  const persistRanges = () => {
    try {
      saveRiskRanges(
        ranges.map((range) => ({
          level: range.level,
          min: Number(range.min),
          max: Number(range.max),
        })),
      )
      setRangesSaved(true)
    } catch {
      setRangesSaved(false)
    }
  }

  const menu: { id: AdminView; label: string }[] = [
    { id: "overview", label: "Resumen" },
    { id: "variables", label: "Variables crediticias" },
    { id: "formula", label: "Fórmula de scoring" },
    { id: "ranges", label: "Configuración de Rangos" },
  ]

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4" role="tablist" aria-label="Herramientas de administración">
        {menu.map((item) => (
          <button
            aria-selected={view === item.id}
            className={`border-b-2 px-3 py-2 text-sm font-semibold ${view === item.id ? "border-blue-700 text-blue-800" : "border-transparent text-slate-500 hover:text-slate-900"}`}
            key={item.id}
            onClick={() => setView(item.id)}
            role="tab"
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {view === "overview" && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">HU16 · HUS01</p>
          <h2 className="mt-2 text-2xl font-bold">Configuración del modelo de riesgo</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Defina las variables crediticias y configure la ponderación de la fórmula. En modo mock, estos cambios viven solo en la sesión del navegador.
          </p>
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <button className="border border-slate-200 bg-white p-5 text-left hover:border-blue-500" onClick={() => setView("variables")} type="button">
              <span className="text-xs font-semibold uppercase text-slate-500">Catálogo</span>
              <span className="mt-2 block text-lg font-bold">{variables.length} variables definidas</span>
              <span className="mt-1 block text-sm text-slate-600">Administrar criterios crediticios</span>
            </button>
            <button className="border border-slate-200 bg-white p-5 text-left hover:border-blue-500" onClick={() => setView("formula")} type="button">
              <span className="text-xs font-semibold uppercase text-slate-500">Modelo</span>
              <span className="mt-2 block text-lg font-bold">{totalWeight}% ponderado</span>
              <span className="mt-1 block text-sm text-slate-600">Revisar fórmula de scoring</span>
            </button>
            <button className="border border-slate-200 bg-white p-5 text-left hover:border-blue-500" onClick={() => setView("ranges")} type="button">
              <span className="text-xs font-semibold uppercase text-slate-500">Clasificación</span>
              <span className="mt-2 block text-lg font-bold">Rangos de riesgo</span>
              <span className="mt-1 block text-sm text-slate-600">Definir niveles Bajo, Medio y Alto</span>
            </button>
          </div>
        </section>
      )}

      {view === "variables" && (
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="flex items-end justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold">Variables crediticias</h2>
                <p className="mt-1 text-sm text-slate-600">Activa o inactiva criterios y conserva su historial.</p>
              </div>
              <span className="text-sm font-semibold tabular-nums text-slate-600">{totalWeight.toLocaleString("es-CO", { maximumFractionDigits: 2 })}% activo</span>
            </div>
            <ul className="divide-y divide-slate-200">
              {variables.map((variable) => (
                <li className={`flex items-center justify-between gap-4 py-4 ${variable.status === "Inactiva" ? "bg-slate-50 opacity-50" : ""}`} key={variable.id}>
                  <div>
                    <p className="text-sm font-semibold">{variable.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{variable.category} · {DATA_TYPE_LABEL[variable.dataType]} · {variable.status}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums">{variable.weight.toLocaleString("es-CO", { maximumFractionDigits: 2 })}%</span>
                    <button
                      aria-pressed={variable.status === "Activa"}
                      className={`min-w-24 border px-2 py-1.5 text-xs font-semibold ${variable.status === "Activa" ? "border-red-200 text-red-700 hover:bg-red-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
                      onClick={() => toggleVariableStatus(variable.id)}
                      type="button"
                    >
                      {variable.status === "Activa" ? "Inactivar" : "Activar"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <form className="space-y-4 border-l border-slate-200 pl-0 lg:pl-6" onSubmit={addVariable}>
            <h3 className="text-base font-bold">Definir variable</h3>
            <label className="block space-y-2 text-sm font-semibold">
              Nombre
              <input
                aria-describedby={duplicateName ? "variable-name-error" : undefined}
                aria-invalid={duplicateName}
                className={`h-10 w-full border bg-white px-3 font-normal outline-none ${duplicateName ? "border-red-600 ring-1 ring-red-600" : "border-slate-300 focus:border-blue-700"}`}
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </label>
            {duplicateName && <p className="-mt-2 text-sm text-red-700" id="variable-name-error" role="alert">Ya existe una variable registrada con este nombre</p>}
            <label className="block space-y-2 text-sm font-semibold">
              Categoría
              <select className="h-10 w-full border border-slate-300 bg-white px-3 font-normal" onChange={(event) => setCategory(event.target.value)} required value={category}>
                <option>Financiera</option><option>Comportamiento</option><option>Estabilidad</option><option>Documental</option>
              </select>
            </label>
            <label className="block space-y-2 text-sm font-semibold">
              Tipo de dato
              <select className="h-10 w-full border border-slate-300 bg-white px-3 font-normal" onChange={(event) => setDataType(event.target.value as DataType)} required value={dataType}>
                <option value="NUMERICO">Numérico</option><option value="PORCENTAJE">Porcentaje</option><option value="CATEGORICO">Categórico</option>
              </select>
            </label>
            <label className="block space-y-2 text-sm font-semibold">
              Peso (%)
              <input className="h-10 w-full border border-slate-300 bg-white px-3 font-normal" min="0.0001" onChange={(event) => setWeight(event.target.value)} required step="0.0001" type="number" value={weight} />
            </label>
            <p className="text-xs text-slate-500">El peso debe ser mayor que 0%; el estado se asigna como Activa.</p>
            <button className="h-10 bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300" disabled={duplicateName} type="submit">Agregar variable</button>
          </form>
        </section>
      )}

      {view === "formula" && (
        <section className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">HUS01 · Configuración local</p>
          <h2 className="mt-2 text-xl font-bold">Fórmula de scoring</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Asigne el porcentaje de cada variable activa. Las variables inactivas se conservan en el catálogo, pero no forman parte de la fórmula.</p>
          <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
            {activeVariables.map((variable) => (
              <div className="flex items-center justify-between gap-4 py-4" key={variable.id}>
                <div>
                  <p className="text-sm font-medium">{variable.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{DATA_TYPE_LABEL[variable.dataType]}</p>
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    aria-label={`Porcentaje para ${variable.name}`}
                    className="h-10 w-28 border border-slate-300 px-2 text-right font-normal outline-none focus:border-blue-700"
                    max="100"
                    min="0.0001"
                    onChange={(event) => updateVariableWeight(variable.id, event.target.value)}
                    step="0.0001"
                    type="number"
                    value={variable.weight}
                  />
                  <span>%</span>
                </label>
              </div>
            ))}
            {activeVariables.length === 0 && <p className="py-5 text-sm text-slate-600">No hay variables activas para configurar.</p>}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <div aria-live="polite">
              <p className={`text-sm font-bold ${formulaComplete ? "text-emerald-700" : "text-red-700"}`}>
                Total ponderado: {totalWeightLabel}%
              </p>
              {!formulaComplete && (
                <p className="mt-1 text-sm text-red-700">
                  {totalWeightUnits < 1000000
                    ? `La suma actual es ${totalWeightLabel}%. Falta un ${weightDifferenceLabel}%`
                    : `La suma actual es ${totalWeightLabel}%. Excede un ${weightDifferenceLabel}%`}
                </p>
              )}
              {formulaComplete && <p className="mt-1 text-sm text-emerald-700">La suma de ponderaciones es exactamente 100%.</p>}
            </div>
            <button className="h-10 bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300" disabled={!formulaComplete || activeVariables.length === 0} onClick={persistFormula} type="button">Guardar Fórmula</button>
          </div>
          {saved && <p className="mt-3 text-sm text-emerald-700" role="status">Fórmula guardada correctamente en esta sesión.</p>}
        </section>
      )}

      {view === "ranges" && (
        <section className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">HU09 · Escala de riesgo</p>
          <h2 className="mt-2 text-xl font-bold">Configuración de Rangos</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Defina rangos inclusivos y continuos que cubran todos los valores de 0 a 1000.</p>

          {rangeValidation.issues.length > 0 && (
            <ul className="mt-5 space-y-2 border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {rangeValidation.issues.map((issue) => <li key={issue}>{issue}</li>)}
            </ul>
          )}

          <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
            {ranges.map((range) => (
              <fieldset className="grid gap-3 py-5 sm:grid-cols-[minmax(100px,1fr)_1fr_1fr] sm:items-start" key={range.level}>
                <legend className="font-semibold">Riesgo {range.level}</legend>
                {(["min", "max"] as const).map((bound) => {
                  const fieldId = `${range.level}-${bound}`
                  const error = rangeValidation.fieldErrors[fieldId]
                  return (
                    <label className="block space-y-1 text-sm text-slate-600" htmlFor={fieldId} key={bound}>
                      {bound === "min" ? "Límite mínimo" : "Límite máximo"}
                      <input
                        aria-describedby={error ? `${fieldId}-error` : undefined}
                        aria-invalid={Boolean(error)}
                        className={`h-10 w-full border bg-white px-3 text-slate-900 outline-none ${error ? "border-red-600 ring-1 ring-red-600" : "border-slate-300 focus:border-blue-700"}`}
                        id={fieldId}
                        max="1000"
                        min="0"
                        onChange={(event) => updateRange(range.level, bound, event.target.value)}
                        required
                        step="1"
                        type="number"
                        value={range[bound]}
                      />
                      {error && <span className="block text-xs text-red-700" id={`${fieldId}-error`}>{error}</span>}
                    </label>
                  )
                })}
              </fieldset>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <p className={`text-sm font-semibold ${rangeValidation.valid ? "text-emerald-700" : "text-red-700"}`}>
              {rangeValidation.valid ? "Los rangos cubren la escala completa sin traslapes." : "Los rangos deben cubrir 0–1000 sin solapamientos ni vacíos."}
            </p>
            <button className="h-10 bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300" disabled={!rangeValidation.valid} onClick={persistRanges} type="button">Guardar Rangos</button>
          </div>
          {rangesSaved && <p className="mt-3 text-sm text-emerald-700" role="status">Rangos guardados correctamente en esta sesión.</p>}
        </section>
      )}
    </div>
  )
}

export default function Dashboard({
  initialAdminView = "overview",
}: {
  initialAdminView?: AdminView
}) {
  const { user, logout, authMode } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [adminView, setAdminView] = useState<AdminView>(initialAdminView)
  const [analystView, setAnalystView] = useState<AnalystView>("solicitantes")
  const accessDenied =
    (location.state as { accessDenied?: unknown } | null)?.accessDenied === true

  useEffect(() => {
    setAdminView(initialAdminView)
  }, [initialAdminView])

  if (!user) return null

  const isAdmin = user.role === "ADMINISTRADOR"
  const menu = isAdmin
    ? [
        { id: "overview" as const, label: "Panel" },
        { id: "variables" as const, label: "Variables crediticias" },
        { id: "formula" as const, label: "Fórmula de scoring" },
        { id: "ranges" as const, label: "Configuración de Rangos" },
      ]
    : [
        { id: "solicitantes" as const, label: "Solicitantes" },
        { id: "simulacion" as const, label: "Simulación de score" },
      ]

  const signOut = () => {
    logout()
    navigate("/login", { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <aside className="flex w-64 shrink-0 flex-col bg-slate-950 px-5 py-7 text-white max-sm:w-16 max-sm:px-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center bg-blue-600 text-xs font-bold">CR</span>
          <span className="max-sm:hidden">
            <span className="block text-sm font-bold">CREDIT RISK</span>
            <span className="block text-[10px] uppercase tracking-wider text-slate-400">Sprint 2 · {ROLE_LABEL[user.role]}</span>
          </span>
        </div>
        <nav aria-label="Navegación principal" className="mt-12 space-y-1">
          {menu.map((item) => {
            const active = isAdmin ? adminView === item.id : analystView === item.id
            return (
              <button
                aria-current={active ? "page" : undefined}
                className={`block w-full border-l-2 px-3 py-3 text-left text-sm transition max-sm:px-0 max-sm:text-center ${active ? "border-blue-400 bg-slate-800 font-semibold text-white" : "border-transparent text-slate-300 hover:bg-slate-800"}`}
                key={item.id}
                onClick={() => isAdmin ? setAdminView(item.id as AdminView) : setAnalystView(item.id as AnalystView)}
                type="button"
              >
                <span className="max-sm:hidden">{item.label}</span>
                <span aria-hidden="true" className="sm:hidden">{item.label.slice(0, 1)}</span>
              </button>
            )
          })}
        </nav>
        <div className="mt-auto border-t border-slate-800 pt-5">
          <p className="truncate text-xs font-semibold max-sm:hidden">{user.email}</p>
          <p className="mt-1 text-[10px] text-slate-400 max-sm:hidden">{authMode === "mock" ? "Modo simulación" : "Sesión conectada"}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-[72px] items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">{ROLE_LABEL[user.role]}</p>
            <h1 className="text-lg font-bold">{isAdmin ? "Administración del modelo" : "Gestión de solicitantes"}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user.email}</p>
              <p className="text-xs text-slate-500">{authMode === "mock" ? "Sesión simulada" : "Sesión autenticada"}</p>
            </div>
            <button className="h-9 border border-slate-300 px-3 text-xs font-semibold hover:bg-slate-100" onClick={signOut} type="button">Cerrar sesión</button>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-5 py-7 sm:px-8 sm:py-9">
          {accessDenied && (
            <div
              className="mb-6 flex items-center justify-between gap-4 border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
              role="alert"
            >
              <span>No tiene permisos para acceder a esta sección</span>
              <button
                aria-label="Cerrar alerta de seguridad"
                className="text-lg leading-none hover:text-red-950"
                onClick={() => navigate("/dashboard", { replace: true, state: null })}
                type="button"
              >
                ×
              </button>
            </div>
          )}
          {isAdmin ? (
            <AdminWorkspace view={adminView} setView={setAdminView} />
          ) : (
            analystView === "solicitantes" ? <RegistroWizard embedded /> : <ScoreSimulator />
          )}
        </main>
      </div>
    </div>
  )
}
