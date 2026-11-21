export interface DistribucionRiesgoItem {
  nivel: "BAJO" | "MEDIO" | "ALTO" | string
  cantidad: number
  porcentaje: number
}

export interface DistribucionRiesgoResponse {
  totalEvaluados: number
  distribucion: DistribucionRiesgoItem[]
}

export interface FiltroFechaParams {
  fechaInicio?: string
  fechaFin?: string
}

type EvaluacionMuestra = {
  id: number
  fecha: string
  nivel: "BAJO" | "MEDIO" | "ALTO"
  puntaje: number
}

type EvaluacionMuestraSemilla = Omit<EvaluacionMuestra, "fecha"> & {
  diasAtras: number
}

const EVALUACIONES_MUESTRA: EvaluacionMuestra[] = ([
  { id: 1001, diasAtras: 0, nivel: "BAJO", puntaje: 842 },
  { id: 1002, diasAtras: 1, nivel: "MEDIO", puntaje: 624 },
  { id: 1003, diasAtras: 2, nivel: "BAJO", puntaje: 755 },
  { id: 1004, diasAtras: 3, nivel: "MEDIO", puntaje: 518 },
  { id: 1005, diasAtras: 4, nivel: "BAJO", puntaje: 901 },
  { id: 1006, diasAtras: 5, nivel: "ALTO", puntaje: 274 },
  { id: 1007, diasAtras: 6, nivel: "BAJO", puntaje: 731 },
  { id: 1008, diasAtras: 7, nivel: "MEDIO", puntaje: 688 },
  { id: 1009, diasAtras: 9, nivel: "BAJO", puntaje: 820 },
  { id: 1010, diasAtras: 10, nivel: "MEDIO", puntaje: 442 },
  { id: 1011, diasAtras: 11, nivel: "ALTO", puntaje: 198 },
  { id: 1012, diasAtras: 13, nivel: "BAJO", puntaje: 779 },
  { id: 1013, diasAtras: 14, nivel: "MEDIO", puntaje: 591 },
  { id: 1014, diasAtras: 16, nivel: "BAJO", puntaje: 867 },
  { id: 1015, diasAtras: 17, nivel: "ALTO", puntaje: 321 },
  { id: 1016, diasAtras: 18, nivel: "MEDIO", puntaje: 704 },
  { id: 1017, diasAtras: 19, nivel: "BAJO", puntaje: 746 },
  { id: 1018, diasAtras: 23, nivel: "BAJO", puntaje: 813 },
  { id: 1019, diasAtras: 25, nivel: "ALTO", puntaje: 156 },
  { id: 1020, diasAtras: 26, nivel: "BAJO", puntaje: 792 },
] satisfies EvaluacionMuestraSemilla[]).map(({ diasAtras, ...evaluation }) => {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() - diasAtras)
  const fecha = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
  return { ...evaluation, fecha }
})

const NIVELES_RIESGO = ["BAJO", "MEDIO", "ALTO"] as const

function filtrarEvaluaciones(filtros: FiltroFechaParams) {
  return EVALUACIONES_MUESTRA.filter((evaluation) => {
    if (filtros.fechaInicio && evaluation.fecha < filtros.fechaInicio) return false
    if (filtros.fechaFin && evaluation.fecha > filtros.fechaFin) return false
    return true
  })
}

function crearDistribucion(filtros: FiltroFechaParams): DistribucionRiesgoResponse {
  const evaluaciones = filtrarEvaluaciones(filtros)
  const totalEvaluados = evaluaciones.length
  const distribucion = NIVELES_RIESGO.map((nivel) => {
    const cantidad = evaluaciones.filter((evaluation) => evaluation.nivel === nivel).length
    return {
      nivel,
      cantidad,
      porcentaje: totalEvaluados === 0 ? 0 : Math.round((cantidad / totalEvaluados) * 1000) / 10,
    }
  })
  return { totalEvaluados, distribucion }
}

export async function obtenerDistribucionRiesgo(
  filtros: FiltroFechaParams,
  token: string,
): Promise<DistribucionRiesgoResponse> {
  void token
  // Integración futura:
  // const query = new URLSearchParams(filtros).toString()
  // const response = await fetch(`/api/dashboard/distribucion-riesgo?${query}`, {
  //   headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  // })
  // if (!response.ok) throw new Error("No fue posible obtener la distribución de riesgo.")
  // return (await response.json()) as DistribucionRiesgoResponse

  await new Promise((resolve) => setTimeout(resolve, 300))
  return crearDistribucion(filtros)
}

function csvField(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`
}

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = objectUrl
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

function buildFilename(filtros: FiltroFechaParams) {
  const start = filtros.fechaInicio || "inicio"
  const end = filtros.fechaFin || "hoy"
  return `reporte-cartera-${start}-${end}.csv`
}

export async function exportarReporteCartera(
  filtros: FiltroFechaParams,
  token: string,
): Promise<void> {
  void token
  // Integración futura:
  // const query = new URLSearchParams(filtros).toString()
  // const response = await fetch(`/api/reportes/cartera/exportar?${query}`, {
  //   headers: { Authorization: `Bearer ${token}`, Accept: "text/csv" },
  // })
  // if (response.ok) {
  //   downloadBlob(await response.blob(), buildFilename(filtros))
  //   return
  // }

  await new Promise((resolve) => setTimeout(resolve, 300))
  const rows = filtrarEvaluaciones(filtros)
  const header = ["id_evaluacion", "fecha_evaluacion", "nivel_riesgo", "puntaje"]
  const csv = [
    header.map(csvField).join(","),
    ...rows.map((row) =>
      [row.id, row.fecha, row.nivel, row.puntaje].map(csvField).join(","),
    ),
  ].join("\r\n")
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" })
  downloadBlob(blob, buildFilename(filtros))
}
