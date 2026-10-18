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

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = "ApiError"
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
    if (typeof data === "string" && data.trim()) {
      message = data
    } else if (data && typeof data === "object") {
      const errorBody = data as Record<string, unknown>
      const detail = errorBody.message ?? errorBody.detail ?? errorBody.error
      if (typeof detail === "string" && detail.trim()) message = detail
    }
    throw new ApiError(message, response.status)
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

export function crearSolicitante(
  payload: SolicitantePayload,
  token: string,
): Promise<SolicitanteResponse> {
  return post<SolicitanteResponse>("/api/solicitantes", payload, token)
}

export function crearPerfilFinanciero(
  payload: PerfilFinancieroPayload,
  token: string,
): Promise<PerfilFinancieroResponse> {
  return post<PerfilFinancieroResponse>("/api/perfil-financiero", payload, token)
}