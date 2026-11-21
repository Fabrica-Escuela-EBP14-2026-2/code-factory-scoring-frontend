export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080"

export type TipoDocumentoApi = "CC" | "CE" | "PASAPORTE" | "PPT" | "TI"

export interface SolicitantePayload {
  tipoDocumento: TipoDocumentoApi
  numeroDocumento: string
  nombre: string
  apellido: string
  telefono: string
  email: string
}

export interface PerfilFinancieroPayload {
  tipoDocumento: TipoDocumentoApi
  numeroDocumento: string
  ingresos: number
  egresos: number
}

export interface SolicitanteResponse extends SolicitantePayload {
  id: number
}

export interface PerfilFinancieroResponse extends PerfilFinancieroPayload {
  id: number
  solicitanteId: number
  ingresoNetoDisponible: number
}

export interface ExisteSolicitanteResponse {
  existe: boolean
}

export interface ValorVariableRequest {
  variableId: number
  valor: number | null
}

export interface CalculoRiesgoRequest {
  valores: ValorVariableRequest[]
}

export interface CalculoRiesgoResponse {
  solicitanteId: number
  puntaje: number
  nivel: string
  fechaCalculo: string
  mensaje: string
}

export interface HistorialEvaluacionVariable {
  variableId: number
  nombre: string
  valor: number | null
  peso: number
}

export interface HistorialEvaluacionDetalle {
  ingresos: number
  egresos: number
  ingresoNetoDisponible: number
  variables: HistorialEvaluacionVariable[]
}

export interface HistorialEvaluacionResponse {
  id: number
  solicitanteId: number
  puntaje: number
  nivel: string
  fechaCalculo: string
  evaluadorEmail: string
  detalle: HistorialEvaluacionDetalle
}

export interface AuditoriaResponse {
  id: number
  usuario: string
  fechaUtc: string
  modulo: string
  accion: string
  valorAnterior: Record<string, unknown> | null
  valorNuevo: Record<string, unknown> | null
}

export interface VariableRiesgo {
  id: number
  nombre: string
  tipoDato: string
  peso: number
  estado: "Activa" | "Inactiva" | string
  fechaRegistro: string
}

export interface CrearVariablePayload {
  nombre: string
  tipoDato: string
  peso: number
}

export interface PonderacionItem {
  variableId: number
  peso: number
}

export interface FormulaScoreResponse {
  id: number
  mensaje: string
  estado: string
  vigente: boolean
  sumaTotal: number
  fechaImplementacion: string
  ponderaciones: PonderacionItem[]
}

export interface RangoRiesgoItem {
  nivel: string
  min: number
  max: number
}

export interface RangosResponse {
  mensaje: string
  rangos: RangoRiesgoItem[]
}

export interface ProblemDetailError {
  title: string
  detail: string
  status: number
  codigo?: string
  camposFaltantes?: string[]
  variablesFaltantes?: string[]
  campo?: string
}

export class ApiError extends Error {
  public readonly title: string
  public readonly detail: string
  public readonly codigo?: string
  public readonly camposFaltantes?: string[]
  public readonly variablesFaltantes?: string[]
  public readonly campo?: string

  constructor(
    message: string,
    public readonly status: number,
    problem: Partial<ProblemDetailError> = {},
  ) {
    super(message)
    this.name = "ApiError"
    this.title = problem.title ?? `Error HTTP ${status}`
    this.detail = problem.detail ?? message
    this.codigo = problem.codigo
    this.camposFaltantes = problem.camposFaltantes
    this.variablesFaltantes = problem.variablesFaltantes
    this.campo = problem.campo
  }
}

function requestHeaders(token?: string, hasBody = false): Headers {
  const headers = new Headers({ Accept: "application/json" })
  if (hasBody) headers.set("Content-Type", "application/json")
  if (token) headers.set("Authorization", `Bearer ${token}`)
  return headers
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.text()
  let data: unknown

  if (body) {
    try {
      data = JSON.parse(body)
    } catch {
      data = body
    }
  }

  if (!response.ok) {
    let message = `Error HTTP ${response.status}`
    let problem: Partial<ProblemDetailError> = {}
    if (typeof data === "string" && data.trim()) {
      message = data
    } else if (data && typeof data === "object") {
      const errorBody = data as Record<string, unknown>
      const detail = errorBody.message ?? errorBody.detail ?? errorBody.error
      if (typeof detail === "string" && detail.trim()) message = detail
      problem = {
        title:
          typeof errorBody.title === "string" ? errorBody.title : undefined,
        detail: typeof errorBody.detail === "string" ? errorBody.detail : message,
        status:
          typeof errorBody.status === "number"
            ? errorBody.status
            : response.status,
        codigo:
          typeof errorBody.codigo === "string" ? errorBody.codigo : undefined,
        camposFaltantes: Array.isArray(errorBody.camposFaltantes)
          ? errorBody.camposFaltantes.filter(
              (field): field is string => typeof field === "string",
            )
          : undefined,
        variablesFaltantes: Array.isArray(errorBody.variablesFaltantes)
          ? errorBody.variablesFaltantes.filter(
              (variable): variable is string => typeof variable === "string",
            )
          : undefined,
        campo: typeof errorBody.campo === "string" ? errorBody.campo : undefined,
      }
    }
    throw new ApiError(message, response.status, problem)
  }

  if (data === undefined) {
    throw new ApiError("El servidor devolvió una respuesta vacía.", response.status)
  }
  return data as T
}

function endpointUrl(path: string): string {
  return `${API_URL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`
}

export async function get<T>(path: string, token?: string): Promise<T> {
  const response = await fetch(endpointUrl(path), {
    method: "GET",
    headers: requestHeaders(token),
  })
  return parseResponse<T>(response)
}

export async function post<T>(
  path: string,
  payload: unknown,
  token?: string,
): Promise<T> {
  const response = await fetch(endpointUrl(path), {
    method: "POST",
    headers: requestHeaders(token, true),
    body: JSON.stringify(payload),
  })
  return parseResponse<T>(response)
}

export async function patch<T>(
  path: string,
  payload: unknown,
  token?: string,
): Promise<T> {
  const response = await fetch(endpointUrl(path), {
    method: "PATCH",
    headers: requestHeaders(token, true),
    body: JSON.stringify(payload),
  })
  return parseResponse<T>(response)
}

export function crearSolicitante(
  payload: SolicitantePayload,
  token: string,
): Promise<SolicitanteResponse> {
  return post<SolicitanteResponse>("/api/solicitantes", payload, token)
}

export function verificarSolicitanteExiste(
  tipoDocumento: string,
  numeroDocumento: string,
  token: string,
): Promise<ExisteSolicitanteResponse> {
  const query = new URLSearchParams({ tipoDocumento, numeroDocumento })
  return get<ExisteSolicitanteResponse>(
    `/api/solicitantes/existe?${query.toString()}`,
    token,
  )
}

export function calcularRiesgoSolicitante(
  solicitanteId: number,
  payload: CalculoRiesgoRequest,
  token: string,
): Promise<CalculoRiesgoResponse> {
  return post<CalculoRiesgoResponse>(
    `/api/solicitantes/${solicitanteId}/calcular-riesgo`,
    payload,
    token,
  )
}

export function consultarHistorialEvaluaciones(
  solicitanteId: number,
  token: string,
): Promise<HistorialEvaluacionResponse[]> {
  return get<HistorialEvaluacionResponse[]>(
    `/api/solicitantes/${solicitanteId}/historial`,
    token,
  )
}

export function consultarBitacoraAuditoria(
  token: string,
): Promise<AuditoriaResponse[]> {
  return get<AuditoriaResponse[]>("/api/auditoria", token)
}

export function listarVariables(token: string): Promise<VariableRiesgo[]> {
  return get<VariableRiesgo[]>("/api/variables", token)
}

export function crearVariable(
  payload: CrearVariablePayload,
  token: string,
): Promise<VariableRiesgo> {
  return post<VariableRiesgo>("/api/variables", payload, token)
}

export function cambiarEstadoVariable(
  id: number,
  estado: "Activa" | "Inactiva",
  token: string,
): Promise<VariableRiesgo> {
  return patch<VariableRiesgo>(`/api/variables/${id}/estado`, { estado }, token)
}

export async function obtenerFormulaVigente(
  token: string,
): Promise<FormulaScoreResponse> {
  try {
    return await get<FormulaScoreResponse>("/api/formula/vigente", token)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return {
        id: 0,
        mensaje: error.detail,
        estado: "Inactiva",
        vigente: false,
        sumaTotal: 0,
        fechaImplementacion: "",
        ponderaciones: [],
      }
    }
    throw error
  }
}

export function guardarFormula(
  ponderaciones: PonderacionItem[],
  token: string,
): Promise<FormulaScoreResponse> {
  return post<FormulaScoreResponse>("/api/formula", { ponderaciones }, token)
}

export function obtenerRangos(token: string): Promise<RangosResponse> {
  return get<RangosResponse>("/api/rangos", token)
}

export function guardarRangos(
  rangos: Array<{ nivel: "BAJO" | "MEDIO" | "ALTO"; min: number; max: number }>,
  token: string,
): Promise<RangosResponse> {
  return post<RangosResponse>("/api/rangos", { rangos }, token)
}

export function crearPerfilFinanciero(
  payload: PerfilFinancieroPayload,
  token: string,
): Promise<PerfilFinancieroResponse> {
  return post<PerfilFinancieroResponse>("/api/perfil-financiero", payload, token)
}