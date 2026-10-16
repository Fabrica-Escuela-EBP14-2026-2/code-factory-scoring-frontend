export type ScoringDataType = "NUMERICO" | "PORCENTAJE" | "CATEGORICO"
export type RiskLevel = "Bajo" | "Medio" | "Alto"

export type ScoringVariable = {
  id: number
  name: string
  dataType: ScoringDataType
  weight: number
  status: "Activa"
}

export type RiskBand = {
  level: RiskLevel
  min: number
  max: number
}

export type ScoringConfiguration = {
  variables: ScoringVariable[]
  ranges: RiskBand[]
  usingFallbackFormula: boolean
  usingFallbackRanges: boolean
}

const FORMULA_STORAGE_KEY = "credit-risk-scoring-formula-v1"
const RANGES_STORAGE_KEY = "credit-risk-scoring-ranges-v1"

export const FALLBACK_FORMULA: ScoringVariable[] = [
  {
    id: 1,
    name: "Historial de pago",
    dataType: "NUMERICO",
    weight: 35,
    status: "Activa",
  },
  {
    id: 2,
    name: "Capacidad de pago",
    dataType: "NUMERICO",
    weight: 30,
    status: "Activa",
  },
  {
    id: 3,
    name: "Estabilidad laboral",
    dataType: "CATEGORICO",
    weight: 35,
    status: "Activa",
  },
]

export const FALLBACK_RANGES: RiskBand[] = [
  { level: "Bajo", min: 701, max: 1000 },
  { level: "Medio", min: 301, max: 700 },
  { level: "Alto", min: 0, max: 300 },
]

function isDataType(value: unknown): value is ScoringDataType {
  return value === "NUMERICO" || value === "PORCENTAJE" || value === "CATEGORICO"
}

function isScoringVariable(value: unknown): value is ScoringVariable {
  if (!value || typeof value !== "object") return false
  const variable = value as Partial<ScoringVariable>
  return (
    Number.isInteger(variable.id) &&
    typeof variable.name === "string" &&
    variable.name.trim().length > 0 &&
    isDataType(variable.dataType) &&
    typeof variable.weight === "number" &&
    Number.isFinite(variable.weight) &&
    variable.weight > 0 &&
    variable.status === "Activa"
  )
}

export function isContinuousRiskScale(ranges: RiskBand[]) {
  if (ranges.length !== 3) return false
  const expectedLevels: RiskLevel[] = ["Bajo", "Medio", "Alto"]
  if (expectedLevels.some((level) => ranges.filter((range) => range.level === level).length !== 1)) {
    return false
  }
  if (
    ranges.some(
      (range) =>
        !Number.isInteger(range.min) ||
        !Number.isInteger(range.max) ||
        range.min < 0 ||
        range.max > 1000 ||
        range.min > range.max,
    )
  ) {
    return false
  }

  const ordered = [...ranges].sort((left, right) => left.min - right.min)
  return (
    ordered[0].min === 0 &&
    ordered[ordered.length - 1].max === 1000 &&
    ordered.every(
      (range, index) => index === 0 || range.min === ordered[index - 1].max + 1,
    )
  )
}

function readFormula(): ScoringVariable[] | null {
  try {
    const stored = localStorage.getItem(FORMULA_STORAGE_KEY)
    if (!stored) return null
    const variables: unknown = JSON.parse(stored)
    if (!Array.isArray(variables) || variables.length === 0) return null
    if (!variables.every(isScoringVariable)) return null
    const totalUnits = variables.reduce(
      (sum, variable) => sum + Math.round(variable.weight * 10000),
      0,
    )
    return totalUnits === 1000000 ? variables : null
  } catch {
    return null
  }
}

function readRanges(): RiskBand[] | null {
  try {
    const stored = localStorage.getItem(RANGES_STORAGE_KEY)
    if (!stored) return null
    const ranges: unknown = JSON.parse(stored)
    if (!Array.isArray(ranges)) return null
    const isBand = (value: unknown): value is RiskBand => {
      if (!value || typeof value !== "object") return false
      const band = value as Partial<RiskBand>
      return (
        (band.level === "Bajo" || band.level === "Medio" || band.level === "Alto") &&
        typeof band.min === "number" &&
        typeof band.max === "number"
      )
    }
    if (!ranges.every(isBand) || !isContinuousRiskScale(ranges)) return null
    return ranges
  } catch {
    return null
  }
}

export function loadScoringConfiguration(): ScoringConfiguration {
  const formula = readFormula()
  const ranges = readRanges()
  return {
    variables: formula ?? FALLBACK_FORMULA,
    ranges: ranges ?? FALLBACK_RANGES,
    usingFallbackFormula: formula === null,
    usingFallbackRanges: ranges === null,
  }
}

export function saveScoringFormula(variables: ScoringVariable[]) {
  const activeVariables = variables.filter((variable) => variable.status === "Activa")
  const totalUnits = activeVariables.reduce(
    (sum, variable) => sum + Math.round(variable.weight * 10000),
    0,
  )
  if (activeVariables.length === 0 || totalUnits !== 1000000) {
    throw new Error("La fórmula debe incluir variables activas que sumen exactamente 100%.")
  }
  localStorage.setItem(FORMULA_STORAGE_KEY, JSON.stringify(activeVariables))
}

export function saveRiskRanges(ranges: RiskBand[]) {
  if (!isContinuousRiskScale(ranges)) {
    throw new Error("Los rangos deben cubrir la escala 0–1000 sin solapamientos ni vacíos.")
  }
  localStorage.setItem(RANGES_STORAGE_KEY, JSON.stringify(ranges))
}

export function scoreVariableValue(value: string, dataType: ScoringDataType) {
  if (dataType === "NUMERICO") {
    if (!value.trim()) return null
    const numericValue = Number(value)
    return Number.isFinite(numericValue) && numericValue >= 0 && numericValue <= 1000
      ? numericValue
      : null
  }
  if (dataType === "PORCENTAJE") {
    if (!value.trim()) return null
    const percentage = Number(value)
    return Number.isFinite(percentage) && percentage >= 0 && percentage <= 100
      ? percentage * 10
      : null
  }

  const categoricalScores: Record<string, number> = {
    "Muy favorable": 1000,
    Favorable: 800,
    Neutral: 600,
    Desfavorable: 400,
    "Muy desfavorable": 200,
    Sí: 1000,
    No: 0,
  }
  return categoricalScores[value] ?? null
}

export function calculateWeightedScore(
  values: Record<string, string>,
  variables: ScoringVariable[],
) {
  let weightedTotal = 0
  for (const variable of variables) {
    const value = scoreVariableValue(values[String(variable.id)] ?? "", variable.dataType)
    if (value === null) return null
    weightedTotal += value * variable.weight
  }
  return Math.round(weightedTotal / 100)
}

export function classifyRisk(score: number, ranges: RiskBand[]): RiskLevel | null {
  return ranges.find((range) => score >= range.min && score <= range.max)?.level ?? null
}
