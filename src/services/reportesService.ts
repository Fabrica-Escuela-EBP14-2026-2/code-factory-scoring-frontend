import { API_URL, get } from "./api"

export interface DistribucionRiesgoItem {
  nivel: "Bajo" | "Medio" | "Alto" | string
  total: number
  porcentaje: number
}

export interface DistribucionRiesgoResponse {
  fechaInicio: string | null
  fechaFin: string | null
  totalSolicitantes: number
  distribucion: DistribucionRiesgoItem[]
  mensaje: string
}

export interface FiltroFechaParams {
  fechaInicio?: string
  fechaFin?: string
}

function buildQuery(filtros: FiltroFechaParams, includeFormat = false) {
  const query = new URLSearchParams()
  if (filtros.fechaInicio) query.set("fechaInicio", filtros.fechaInicio)
  if (filtros.fechaFin) query.set("fechaFin", filtros.fechaFin)
  if (includeFormat) query.set("formato", "CSV")
  const serialized = query.toString()
  return serialized ? `?${serialized}` : ""
}

export async function obtenerDistribucionRiesgo(
  filtros: FiltroFechaParams,
  token: string,
): Promise<DistribucionRiesgoResponse> {
  return get<DistribucionRiesgoResponse>(
    `/api/dashboard/distribucion-riesgo${buildQuery(filtros)}`,
    token,
  )
}

function getFilename(contentDisposition: string | null) {
  const encodedFilename = contentDisposition?.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1]
  if (encodedFilename) {
    try {
      return decodeURIComponent(encodedFilename.trim().replace(/^"|"$/g, ""))
    } catch {
      // Fall through to the regular filename parameter.
    }
  }

  const filename = contentDisposition?.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i)
  return filename?.[1] ?? filename?.[2]?.trim() ?? "reporte-cartera-riesgo.csv"
}

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = objectUrl
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}

export async function exportarReporteCartera(
  filtros: FiltroFechaParams,
  token: string,
): Promise<void> {
  const endpoint = `${API_URL.replace(/\/+$/, "")}/api/reportes/cartera/exportar${buildQuery(filtros, true)}`
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "text/csv",
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const problem: unknown = await response.json().catch(() => null)
    const detail =
      problem && typeof problem === "object" && "detail" in problem &&
      typeof problem.detail === "string"
        ? problem.detail
        : `No fue posible exportar el reporte (HTTP ${response.status}).`
    throw new Error(detail)
  }

  downloadBlob(await response.blob(), getFilename(response.headers.get("Content-Disposition")))
}
