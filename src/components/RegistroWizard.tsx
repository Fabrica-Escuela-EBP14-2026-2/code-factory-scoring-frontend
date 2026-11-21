import { useState, useEffect, useId, useRef } from "react"
import { useAuth } from "../context/AuthContext"
import {
  ApiError,
  calcularRiesgoSolicitante,
  crearPerfilFinanciero,
  crearSolicitante,
  listarVariables,
  verificarSolicitanteExiste,
  type CalculoRiesgoResponse,
  type SolicitanteResponse,
  type ValorVariableRequest,
  type VariableRiesgo,
} from "../services/api"

const RUTA_ASSETS = "/assets/"

const ICONOS = {
  escudo: `${RUTA_ASSETS}f465f.svg`,
  graficoColumnas: `${RUTA_ASSETS}02e89.svg`,
  usuarios: `${RUTA_ASSETS}fd88a.svg`,
  buscarArchivo: `${RUTA_ASSETS}399b3.svg`,
  graficoBarras: `${RUTA_ASSETS}fc541.svg`,
  configuracion: `${RUTA_ASSETS}ccf6b.svg`,
  puntoActivo: `${RUTA_ASSETS}b215c.svg`,
  campana: `${RUTA_ASSETS}d91bf.svg`,
  chevronAbajo: `${RUTA_ASSETS}38910.svg`,
  guardar: `${RUTA_ASSETS}d3c41.svg`,
  alertaTriangulo: `${RUTA_ASSETS}1276a.svg`,
  alertaCirculo: `${RUTA_ASSETS}b0abf.svg`,
  confirmar: `${RUTA_ASSETS}4bd7b.svg`,
  tendenciaAlza: `${RUTA_ASSETS}aef6f.svg`,
  tendenciaBaja: `${RUTA_ASSETS}e7635.svg`,
}

type EstadoNotificacion = {
  type: "success" | "error"
  title: string
  sub: string
} | null

type FormularioSolicitante = {
  tipoDoc: string
  numDoc: string
  nombres: string
  apellidos: string
  correo: string
  telefono: string
}

type TipoDocumentoApi = "CC" | "CE" | "PASAPORTE" | "PPT" | "TI"

type SolicitantePayload = {
  tipoDocumento: TipoDocumentoApi
  numeroDocumento: string
  nombre: string
  apellido: string
  telefono: string
  email: string
}

type PerfilFinancieroPayload = {
  tipoDocumento: TipoDocumentoApi
  numeroDocumento: string
  ingresos: number
  egresos: number
}

type ErroresSolicitante = Partial<Record<keyof FormularioSolicitante, string>>

type FormularioFinanciero = { ingresos: string; egresos: string }
type ErroresFinancieros = Record<string, string>

type EvaluacionScore = {
  ing: number
  eg: number
  resultado: CalculoRiesgoResponse
}

function normalizarTexto(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

const TIPO_DOCUMENTO_API: Record<string, TipoDocumentoApi> = {
  "Cédula de Ciudadanía": "CC",
  "Cédula de Extranjería": "CE",
  "Pasaporte Nacional": "PASAPORTE",
  "Permiso por Protección Temporal": "PPT",
  "Tarjeta de Identidad": "TI",
}

function obtenerTipoDocumentoApi(tipoDoc: string): TipoDocumentoApi {
  const tipoDocumento = TIPO_DOCUMENTO_API[tipoDoc]
  if (!tipoDocumento) throw new Error("Tipo de documento no soportado.")
  return tipoDocumento
}

function normalizarSolicitante(
  form: FormularioSolicitante,
): SolicitantePayload {
  return {
    tipoDocumento: obtenerTipoDocumentoApi(form.tipoDoc),
    numeroDocumento: form.numDoc.replace(/\s/g, "").trim(),
    nombre: normalizarTexto(form.nombres),
    apellido: normalizarTexto(form.apellidos),
    telefono: form.telefono.trim(),
    email: form.correo.trim().toLowerCase(),
  }
}

async function guardarSolicitante(
  payload: SolicitantePayload,
  token: string,
): Promise<SolicitanteResponse> {
  return crearSolicitante(payload, token)
}

async function guardarDatosFinancieros(
  payload: PerfilFinancieroPayload,
  token: string,
): Promise<unknown> {
  return crearPerfilFinanciero(payload, token)
}

const OPCIONES_MENU = [
  { label: "Dashboard", icon: ICONOS.graficoColumnas, id: "dashboard" },
  { label: "Solicitantes", icon: ICONOS.usuarios, id: "solicitantes" },
  { label: "Evaluaciones", icon: ICONOS.buscarArchivo, id: "evaluaciones" },
  { label: "Reportes", icon: ICONOS.graficoBarras, id: "reportes" },
  { label: "Configuracion", icon: ICONOS.configuracion, id: "configuracion" },
]

function Sidebar() {
  return (
    <aside
      className="bg-[#0f172a] flex flex-col gap-10 items-start px-5 py-8 self-stretch shrink-0 w-[260px]"
      aria-label="Navegación principal"
    >
      <div className="flex gap-3 items-center w-full">
        <div
          className="bg-[#2563eb] flex items-center justify-center rounded-lg shrink-0 size-9"
          aria-hidden="true"
        >
          <div className="size-5 relative shrink-0">
            <img
              alt=""
              className="absolute inset-0 size-full"
              src={ICONOS.escudo}
            />
          </div>
        </div>
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <p className="font-['Geist:Bold'] font-bold text-white text-base leading-tight">
            CREDIT RISK
          </p>
          <p className="font-['Geist:SemiBold'] font-semibold text-[#94a3b8] text-[11px] leading-tight">
            SISTEMA DE CONTROL
          </p>
        </div>
      </div>

      <nav className="flex flex-col gap-2 w-full" aria-label="Menú">
        {OPCIONES_MENU.map((item) => {
          const active = item.id === "solicitantes"
          return (
            <a
              key={item.id}
              href="#"
              onClick={(e) => e.preventDefault()}
              aria-current={active ? "page" : undefined}
              className={`flex gap-3 h-11 items-center px-4 rounded-lg w-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3b82f6] focus-visible:outline-offset-1 ${
                active
                  ? "bg-[#1e293b] border-l-[3px] border-[#3b82f6]"
                  : "hover:bg-[#1e293b]/60"
              }`}
            >
              <div className="size-5 relative shrink-0" aria-hidden="true">
                <img
                  alt=""
                  className="absolute inset-0 size-full"
                  src={item.icon}
                />
              </div>
              <span
                className={`flex-1 text-sm leading-normal ${
                  active
                    ? "font-['Geist:SemiBold'] font-semibold text-[#f8fafc]"
                    : "font-['Geist:Medium'] font-medium text-[#94a3b8]"
                }`}
              >
                {item.label}
              </span>
            </a>
          )
        })}
      </nav>

      <div className="bg-[#1e293b] flex flex-col gap-3 items-start p-3 rounded-xl w-full mt-auto">
        <p className="font-['Geist:SemiBold'] font-semibold text-white text-xs">
          Servidor Activo
        </p>
        <div className="flex gap-2 items-center w-full">
          <div className="relative shrink-0 size-2" aria-hidden="true">
            <img
              alt=""
              className="absolute inset-0 size-full"
              src={ICONOS.puntoActivo}
            />
          </div>
          <p className="font-['Geist:Regular'] font-normal text-[#94a3b8] text-[11px] flex-1 min-w-0">
            Región: Latam-South
          </p>
        </div>
      </div>
    </aside>
  )
}
// Encabezado global con contexto de la vista y datos del usuario activo.

function Header({ title, badge }: { title: string; badge: string }) {
  return (
    <header className="bg-white border-b border-[#e2e8f0] flex h-[72px] items-center justify-between px-8 shrink-0 w-full">
      <div className="flex gap-3 items-center">
        <h1 className="font-['Geist:Bold'] font-bold text-[#0f172a] text-lg whitespace-nowrap">
          {title}
        </h1>
        <span className="bg-[#eff6ff] px-2 py-0.5 rounded-full font-['Geist:SemiBold'] font-semibold text-[#2563eb] text-[11px] whitespace-nowrap">
          {badge}
        </span>
      </div>
      <div className="flex gap-4 items-center">
        <button
          type="button"
          aria-label="Notificaciones"
          className="bg-[#f8fafc] flex items-center justify-center rounded-full shrink-0 size-9 hover:bg-[#e2e8f0] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563eb]"
        >
          <div className="size-[18px] relative" aria-hidden="true">
            <img
              alt=""
              className="absolute inset-0 size-full"
              src={ICONOS.campana}
            />
          </div>
        </button>
        <div className="flex gap-2.5 items-center">
          <div className="flex flex-col gap-0.5 items-end whitespace-nowrap">
            <p className="font-['Geist:SemiBold'] font-semibold text-[#0f172a] text-sm">
              Lic. Alejandro Silva
            </p>
            <p className="font-['Geist:Regular'] font-normal text-[#64748b] text-[11px]">
              Analista de Riesgo Principal
            </p>
          </div>
          <div
            className="bg-[#2563eb] flex items-center justify-center rounded-full shrink-0 size-10"
            aria-hidden="true"
          >
            <span className="font-['Geist:Bold'] font-bold text-white text-sm">
              AS
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

// Notificación temporal para confirmar operaciones o comunicar errores.

function Notificacion({
  toast,
  onClose,
}: {
  toast: EstadoNotificacion
  onClose: () => void
}) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [toast, onClose])

  if (!toast) return null
  const ok = toast.type === "success"

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={`fixed top-8 right-8 z-50 flex gap-3 items-center p-4 rounded-xl w-[420px] max-w-[calc(100vw-2rem)] shadow-lg border ${
        ok ? "bg-[#ecfdf5] border-[#10b981]" : "bg-[#fef2f2] border-[#fca5a5]"
      }`}
    >
      <div
        className={`flex items-center justify-center rounded-[14px] shrink-0 size-7 ${
          ok ? "bg-[#10b981]" : "bg-[#fca5a5]"
        }`}
        aria-hidden="true"
      >
        <div className="size-4 relative">
          <img
            alt=""
            className="absolute inset-0 size-full"
            src={ok ? ICONOS.confirmar : ICONOS.alertaTriangulo}
          />
        </div>
      </div>
      <div
        className={`flex flex-col gap-0.5 flex-1 min-w-0 ${
          ok ? "text-[#065f46]" : "text-[#991b1b]"
        }`}
      >
        <p className="font-['Geist:SemiBold'] font-semibold text-sm">
          {toast.title}
        </p>
        <p className="font-['Geist:Regular'] font-normal text-xs opacity-85">
          {toast.sub}
        </p>
      </div>
      <button
        type="button"
        aria-label="Cerrar notificación"
        onClick={onClose}
        className={`shrink-0 text-xl leading-none opacity-60 hover:opacity-100 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-current rounded ${
          ok ? "text-[#065f46]" : "text-[#991b1b]"
        }`}
      >
        ×
      </button>
    </div>
  )
}

// Indicador visual del avance por las etapas del registro.

const PASOS = [
  "Registro de Solicitante",
  "Información Financiera",
  "Resumen Financiero",
]

function IndicadorPasos({ current }: { current: number }) {
  return (
    <nav
      aria-label="Pasos del formulario"
      className="flex items-start gap-0 mb-8 w-full max-w-[580px] mx-auto"
    >
      {PASOS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                aria-current={active ? "step" : undefined}
                className={`size-8 rounded-full flex items-center justify-center text-sm font-['Geist:Bold'] font-bold transition-colors ${
                  done
                    ? "bg-[#10b981] text-white"
                    : active
                      ? "bg-[#2563eb] text-white"
                      : "bg-[#e2e8f0] text-[#94a3b8]"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={`text-[11px] whitespace-nowrap font-['Geist:Medium'] font-medium text-center ${
                  active
                    ? "text-[#2563eb]"
                    : done
                      ? "text-[#10b981]"
                      : "text-[#94a3b8]"
                }`}
              >
                {label}
              </span>
            </div>
            {i < PASOS.length - 1 && (
              <div
                className={`h-px flex-1 mx-3 mt-4 transition-colors ${
                  done ? "bg-[#10b981]" : "bg-[#e2e8f0]"
                }`}
                aria-hidden="true"
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}

// Mensaje accesible asociado a un campo que no supera la validación.

function MensajeError({ id, message }: { id: string; message?: string }) {
  return (
    <p
      id={id}
      role="alert"
      className={
        message
          ? "font-['Inter:Medium'] font-medium text-[#dc2626] text-xs leading-normal"
          : "sr-only"
      }
    >
      {message}
    </p>
  )
}

// Primera etapa: captura y validación de la información básica.

const OPCIONES_TIPO_DOCUMENTO = [
  "Cédula de Ciudadanía",
  "Cédula de Extranjería",
  "Pasaporte Nacional",
  "Permiso por Protección Temporal",
  "Tarjeta de Identidad",
]

const TIPOS_DOCUMENTO_NUMERICOS = new Set([
  "Cédula de Ciudadanía",
  "Cédula de Extranjería",
  "Tarjeta de Identidad",
])

function esDocumentoNumerico(tipoDoc: string) {
  return TIPOS_DOCUMENTO_NUMERICOS.has(tipoDoc)
}

function validarSolicitante(form: FormularioSolicitante): ErroresSolicitante {
  const e: ErroresSolicitante = {}
  if (!form.tipoDoc) e.tipoDoc = "Seleccione un tipo de documento."
  if (!form.nombres.trim()) e.nombres = "Este campo es obligatorio."
  if (!form.apellidos.trim()) e.apellidos = "Este campo es obligatorio."
  if (!form.numDoc.trim()) {
    e.numDoc = "Este campo es obligatorio."
  } else if (
    esDocumentoNumerico(form.tipoDoc) &&
    !/^\d{6,15}$/.test(form.numDoc.trim())
  ) {
    e.numDoc = "Formato inválido: ingrese solo números (6 a 15 dígitos)."
  }
  if (!form.correo.trim()) {
    e.correo = "Este campo es obligatorio."
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) {
    e.correo = "Formato de correo electrónico inválido."
  }
  if (!form.telefono.trim()) {
    e.telefono = "Este campo es obligatorio."
  } else if (!/^\d{7,10}$/.test(form.telefono)) {
    e.telefono = "Formato inválido: ingrese solo números (7 a 10 dígitos)."
  }
  return e
}

function PasoRegistro({
  onSuccess,
  isSavingSolicitante,
  token,
}: {
  onSuccess: (d: SolicitantePayload) => void | Promise<void>
  isSavingSolicitante: boolean
  token: string | null
}) {
  const uid = useId()
  const [form, setForm] = useState<FormularioSolicitante>({
    tipoDoc: "Cédula de Ciudadanía",
    numDoc: "",
    nombres: "",
    apellidos: "",
    correo: "",
    telefono: "",
  })
  const [errors, setErrors] = useState<ErroresSolicitante>({})
  const [touched, setTouched] =
    useState<Partial<Record<keyof FormularioSolicitante, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)
  const duplicateCheckSequence = useRef(0)

  const checkDuplicate = async (target: FormularioSolicitante) => {
    const documentNumber = target.numDoc.replace(/\s/g, "").trim()
    if (
      !documentNumber ||
      (esDocumentoNumerico(target.tipoDoc) && !/^\d{6,15}$/.test(documentNumber))
    ) {
      return false
    }
    if (!token) {
      setErrors((previous) => ({
        ...previous,
        numDoc: "Debe iniciar sesión para verificar el documento.",
      }))
      return true
    }

    const sequence = ++duplicateCheckSequence.current
    setIsCheckingDuplicate(true)
    try {
      const { existe } = await verificarSolicitanteExiste(
        obtenerTipoDocumentoApi(target.tipoDoc),
        documentNumber,
        token,
      )
      if (sequence !== duplicateCheckSequence.current) return false
      setIsDuplicate(existe)
      setErrors((previous) => {
        const next = { ...previous }
        if (existe) {
          next.numDoc = "El solicitante con este tipo y número de documento ya se encuentra registrado."
        } else if (next.numDoc?.includes("ya se encuentra registrado")) {
          delete next.numDoc
        }
        return next
      })
      return existe
    } catch (error) {
      if (sequence === duplicateCheckSequence.current) {
        setErrors((previous) => ({
          ...previous,
          numDoc:
            error instanceof Error
              ? error.message
              : "No fue posible verificar el documento con el backend.",
        }))
      }
      return true
    } finally {
      if (sequence === duplicateCheckSequence.current) {
        setIsCheckingDuplicate(false)
      }
    }
  }

  const validationErrors = validarSolicitante(form)
  const active = submitted ? { ...errors, ...validationErrors } : errors
  const hasErrors = Object.keys(active).length > 0
  const hasValidationErrors =
    Object.keys(validationErrors).length > 0 ||
    isDuplicate ||
    Boolean(active.numDoc) ||
    isCheckingDuplicate

  const set =
    (f: keyof FormularioSolicitante) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const next = { ...form, [f]: e.target.value }
      setForm(next)
      if (f === "numDoc" || f === "tipoDoc") {
        duplicateCheckSequence.current += 1
        setIsDuplicate(false)
        setIsCheckingDuplicate(false)
      }
      const fieldErrors = validarSolicitante(next)
      const fieldsToUpdate: (keyof FormularioSolicitante)[] =
        f === "tipoDoc" ? [f, "numDoc"] : [f]
      setErrors((previous) => {
        const updated = { ...previous }
        for (const field of fieldsToUpdate) {
          if (fieldErrors[field]) updated[field] = fieldErrors[field]
          else delete updated[field]
        }
        return updated
      })
    }

  const blur =
    (f: keyof FormularioSolicitante) =>
    (event: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      const currentForm = { ...form, [f]: event.currentTarget.value }
      setForm(currentForm)
    setTouched((t) => ({ ...t, [f]: true }))
      setErrors(validarSolicitante(currentForm))
      if (f === "numDoc" || f === "tipoDoc") void checkDuplicate(currentForm)
    }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const errs = validationErrors
    setErrors(errs)
    if (Object.keys(errs).length === 0 && !(await checkDuplicate(form))) {
      try {
        await onSuccess(normalizarSolicitante(form))
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 409 &&
          error.campo === "numeroDocumento"
        ) {
          setErrors((previous) => ({ ...previous, numDoc: error.detail }))
        }
      }
    }
  }

  const fid = (k: string) => `${uid}-${k}`
  const eid = (k: string) => `${uid}-${k}-err`

  const base =
    "bg-white border border-[#cbd5e1] flex h-[42px] items-center px-3.5 rounded-lg w-full transition-colors focus-within:border-[#2563eb] focus-within:ring-1 focus-within:ring-[#2563eb]/30"
  const err =
    "bg-[#fef2f2] border border-[#ef4444] flex h-[42px] items-center px-3.5 rounded-lg w-full focus-within:ring-1 focus-within:ring-[#ef4444]/30"
  const cls = (k: keyof FormularioSolicitante) => (active[k] ? err : base)

  const inputCls = (k: keyof FormularioSolicitante) =>
    `bg-transparent flex-1 min-w-0 font-['Geist:Regular'] font-normal text-sm outline-none placeholder:text-[#94a3b8] ${
      active[k] ? "text-[#0f172a]" : "text-[#0f172a]"
    }`

  const AlertIcon = () => (
    <div className="size-4 relative shrink-0 ml-2" aria-hidden="true">
      <img
        alt=""
        className="absolute inset-0 size-full"
        src={ICONOS.alertaCirculo}
      />
    </div>
  )

  return (
    <form onSubmit={submit} noValidate aria-label="Registro de Solicitante">
      <div className="bg-white border border-[#e2e8f0] shadow-[0_4px_10px_rgba(0,0,0,0.03)] flex flex-col gap-8 items-start p-10 rounded-2xl w-full max-w-[580px] mx-auto">
        <div className="flex flex-col gap-2 w-full">
          <h2 className="font-['Geist:Bold'] font-bold text-[#0f172a] text-[22px]">
            Registro de Solicitante
          </h2>
          <p className="font-['Geist:Regular'] font-normal text-[#64748b] text-[13px]">
            Ingrese la información oficial de identificación para inicializar la
            solicitud de crédito.
          </p>
        </div>

        {(isDuplicate || (hasErrors && submitted)) && (
          <div
            role="alert"
            className="bg-[#fffbeb] border-l-4 border-[#f59e0b] flex gap-2.5 items-center p-3 rounded-lg w-full"
          >
            <div className="size-[18px] relative shrink-0" aria-hidden="true">
              <img
                alt=""
                className="absolute inset-0 size-full"
                src={ICONOS.alertaTriangulo}
              />
            </div>
            <p className="font-['Geist:Medium'] font-medium text-[#92400e] text-[13px] flex-1 min-w-0">
              {isDuplicate
                ? "El documento ya está registrado. Ingrese un tipo y número de documento diferente."
                : "Por favor, corrija los errores marcados en rojo antes de continuar."}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-5 w-full">
          {/* Tipo y número de documento */}
          <div className="flex gap-4 items-start flex-col sm:flex-row">
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <label
                htmlFor={fid("tipoDoc")}
                className="font-['Geist:SemiBold'] font-semibold text-[#475569] text-[13px]"
              >
                Tipo de Documento
              </label>
              <div className={`${base} relative`}>
                <select
                  id={fid("tipoDoc")}
                  value={form.tipoDoc}
                  onChange={set("tipoDoc")}
                  onBlur={blur("tipoDoc")}
                  aria-invalid={!!active.tipoDoc}
                  className="appearance-none bg-transparent flex-1 min-w-0 font-['Geist:Regular'] font-normal text-[#0f172a] text-sm outline-none cursor-pointer pr-6"
                >
                  {OPCIONES_TIPO_DOCUMENTO.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
                <div
                  className="size-4 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                >
                  <img
                    alt=""
                    className="absolute inset-0 size-full"
                    src={ICONOS.chevronAbajo}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <label
                htmlFor={fid("numDoc")}
                className="font-['Geist:SemiBold'] font-semibold text-[#475569] text-[13px]"
              >
                Número de Documento
              </label>
              <div className={cls("numDoc")}>
                <input
                  id={fid("numDoc")}
                  type="text"
                  value={form.numDoc}
                  onChange={set("numDoc")}
                  onBlur={blur("numDoc")}
                  placeholder="Ej. 1023456789"
                  aria-required="true"
                  aria-invalid={!!active.numDoc}
                  aria-describedby={eid("numDoc")}
                  className={inputCls("numDoc")}
                />
                {active.numDoc && <AlertIcon />}
              </div>
              <MensajeError id={eid("numDoc")} message={active.numDoc} />
            </div>
          </div>

          {/* Nombres y apellidos */}
          <div className="flex gap-4 items-start flex-col sm:flex-row">
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <label
                htmlFor={fid("nombres")}
                className="font-['Geist:SemiBold'] font-semibold text-[#475569] text-[13px]"
              >
                Nombres
              </label>
              <div className={cls("nombres")}>
                <input
                  id={fid("nombres")}
                  type="text"
                  value={form.nombres}
                  onChange={set("nombres")}
                  onBlur={blur("nombres")}
                  placeholder="Ej. Carlos Eduardo"
                  aria-required="true"
                  aria-invalid={!!active.nombres}
                  aria-describedby={eid("nombres")}
                  className={inputCls("nombres")}
                />
                {active.nombres && <AlertIcon />}
              </div>
              <MensajeError id={eid("nombres")} message={active.nombres} />
            </div>
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <label
                htmlFor={fid("apellidos")}
                className="font-['Geist:SemiBold'] font-semibold text-[#475569] text-[13px]"
              >
                Apellidos
              </label>
              <div className={cls("apellidos")}>
                <input
                  id={fid("apellidos")}
                  type="text"
                  value={form.apellidos}
                  onChange={set("apellidos")}
                  onBlur={blur("apellidos")}
                  placeholder="Ej. Mendoza Ruiz"
                  aria-required="true"
                  aria-invalid={!!active.apellidos}
                  aria-describedby={eid("apellidos")}
                  className={inputCls("apellidos")}
                />
                {active.apellidos && <AlertIcon />}
              </div>
              <MensajeError id={eid("apellidos")} message={active.apellidos} />
            </div>
          </div>

          {/* Correo electrónico */}
          <div className="flex flex-col gap-2 w-full">
            <label
              htmlFor={fid("correo")}
              className="font-['Geist:SemiBold'] font-semibold text-[#475569] text-[13px]"
            >
              Correo Electrónico
            </label>
            <div className={cls("correo")}>
              <input
                id={fid("correo")}
                type="email"
                value={form.correo}
                onChange={set("correo")}
                onBlur={blur("correo")}
                placeholder="carlos.mendoza@empresa.com"
                aria-required="true"
                aria-invalid={!!active.correo}
                aria-describedby={eid("correo")}
                className={inputCls("correo")}
              />
              {active.correo && <AlertIcon />}
            </div>
            <MensajeError id={eid("correo")} message={active.correo} />
          </div>

          {/* Teléfono de contacto */}
          <div className="flex flex-col gap-2 w-full">
            <label
              htmlFor={fid("telefono")}
              className="font-['Geist:SemiBold'] font-semibold text-[#475569] text-[13px]"
            >
              Teléfono
            </label>
            <div className={cls("telefono")}>
              <input
                id={fid("telefono")}
                type="tel"
                value={form.telefono}
                onChange={set("telefono")}
                onBlur={blur("telefono")}
                placeholder="3124567890"
                aria-required="true"
                aria-invalid={!!active.telefono}
                aria-describedby={eid("telefono")}
                className={inputCls("telefono")}
              />
              {active.telefono && <AlertIcon />}
            </div>
            <MensajeError id={eid("telefono")} message={active.telefono} />
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            type="submit"
            disabled={hasValidationErrors || isSavingSolicitante}
            aria-disabled={hasValidationErrors || isSavingSolicitante}
            className={`flex gap-2 h-[46px] items-center justify-center rounded-lg w-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb] ${
              hasValidationErrors || isSavingSolicitante
                ? "bg-[#e5e7eb] cursor-not-allowed"
                : "bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] cursor-pointer"
            }`}
          >
            <div className="size-4 relative shrink-0" aria-hidden="true">
              <img
                alt=""
                className={`absolute inset-0 size-full ${
                  isSavingSolicitante ? "animate-pulse" : ""
                }`}
                src={ICONOS.guardar}
              />
            </div>
            <span
              className={`font-['Geist:SemiBold'] font-semibold text-sm whitespace-nowrap ${
                hasValidationErrors || isSavingSolicitante
                  ? "text-[#9ca3af]"
                  : "text-white"
              }`}
            >
              {isSavingSolicitante ? "Guardando..." : "Guardar Solicitante"}
            </span>
          </button>
          <p className="font-['Geist:Regular'] font-normal text-[#64748b] text-[11px] text-center">
            Toda la información se encripta según el estándar bancario PCI-DSS.
          </p>
        </div>
      </div>
    </form>
  )
}

// Segunda etapa: captura de ingresos, egresos y cálculo del neto disponible.

// Convierte un monto a número y rechaza valores vacíos, ambiguos o no finitos.
function parseFinancialAmount(value: string): number | null {
  const normalized = value.replace(/,/g, "").trim()
  if (!normalized) return null

  const numericValue = Number(normalized)
  if (!Number.isFinite(numericValue) || numericValue < 0) return null
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null

  return numericValue
}

function validarFinanzas(
  form: FormularioFinanciero,
  variables: VariableRiesgo[],
  variableValues: Record<string, string>,
): ErroresFinancieros {
  const e: ErroresFinancieros = {}
  const ingVal = parseFinancialAmount(form.ingresos)
  const egVal = parseFinancialAmount(form.egresos)
  if (!form.ingresos.trim()) {
    e.ingresos = "Este campo es obligatorio."
  } else if (ingVal === null) {
    e.ingresos =
      "El valor ingresado no es válido. Debe ser un monto numérico no negativo."
  }
  if (!form.egresos.trim()) {
    e.egresos = "Este campo es obligatorio."
  } else if (egVal === null) {
    e.egresos =
      "El valor ingresado no es válido. Debe ser un monto numérico no negativo."
  }
  for (const variable of variables) {
    const key = `variable-${variable.id}`
    const value = variableValues[String(variable.id)] ?? ""
    if (value.trim()) {
      const numericValue = Number(value)
      if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 100) {
        e[key] = "Ingrese un valor numérico entre 0 y 100."
      }
    }
  }
  return e
}

function PasoFinanciero({
  onSuccess,
  onBack,
  isSavingFinanciero,
  calculationError,
  onClearCalculationError,
  token,
  hidden = false,
}: {
  onSuccess: (
    ing: number,
    eg: number,
    variableValues: Record<string, string>,
    variables: VariableRiesgo[],
  ) => void
  onBack: () => void
  isSavingFinanciero: boolean
  calculationError: ApiError | null
  onClearCalculationError: () => void
  token: string | null
  hidden?: boolean
}) {
  const uid = useId()
  const [variables, setVariables] = useState<VariableRiesgo[]>([])
  const [variablesLoading, setVariablesLoading] = useState(true)
  const [variablesError, setVariablesError] = useState("")
  const [form, setForm] = useState<FormularioFinanciero>({
    ingresos: "",
    egresos: "",
  })
  const [errors, setErrors] = useState<ErroresFinancieros>({})
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!token) {
      setVariablesError("Debe iniciar sesión para cargar las variables de riesgo.")
      setVariablesLoading(false)
      return
    }

    let active = true
    setVariablesLoading(true)
    setVariablesError("")
    void listarVariables(token)
      .then((result) => {
        if (active) setVariables(result.filter((variable) => variable.estado === "Activa"))
      })
      .catch((error: unknown) => {
        if (!active) return
        setVariablesError(
          error instanceof ApiError
            ? error.detail
            : error instanceof Error
              ? error.message
              : "No fue posible cargar las variables de riesgo.",
        )
      })
      .finally(() => {
        if (active) setVariablesLoading(false)
      })

    return () => {
      active = false
    }
  }, [token])

  const validationErrors = validarFinanzas(form, variables, variableValues)
  const active = submitted ? validationErrors : errors
  const hasErrors = Object.keys(active).length > 0
  const missingFields = [
    validationErrors.ingresos ? "Ingresos Mensuales" : null,
    validationErrors.egresos ? "Egresos Fijos" : null,
  ].filter((field): field is string => field !== null)
  const currentIngresos = parseFinancialAmount(form.ingresos)
  const currentEgresos = parseFinancialAmount(form.egresos)
  const currentNeto =
    currentIngresos !== null && currentEgresos !== null
      ? currentIngresos - currentEgresos
      : null

  const set =
    (f: keyof FormularioFinanciero) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = { ...form, [f]: e.target.value }
      setForm(next)
      onClearCalculationError()
      if (submitted) setErrors(validarFinanzas(next, variables, variableValues))
    }

  const blur = () => {
    if (!submitted) setErrors(validarFinanzas(form, variables, variableValues))
  }

  const setVariableValue = (id: number, value: string) => {
    const next = { ...variableValues, [String(id)]: value }
    setVariableValues(next)
    onClearCalculationError()
    if (submitted) setErrors(validarFinanzas(form, variables, next))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    onClearCalculationError()
    const errs = validarFinanzas(form, variables, variableValues)
    setErrors(errs)
    if (Object.keys(errs).length === 0) {
      const ingresos = parseFinancialAmount(form.ingresos)
      const egresos = parseFinancialAmount(form.egresos)
      if (ingresos !== null && egresos !== null) {
        onSuccess(ingresos, egresos, variableValues, variables)
      }
    }
  }

  const fid = (k: string) => `${uid}-${k}`
  const eid = (k: string) => `${uid}-${k}-err`

  const base =
    "bg-white border border-[#cbd5e1] flex gap-2 h-[42px] items-center px-3.5 rounded-lg w-full transition-colors focus-within:border-[#2563eb] focus-within:ring-1 focus-within:ring-[#2563eb]/30"
  const err =
    "bg-[#fef2f2] border-[1.5px] border-[#ef4444] flex gap-2 h-[42px] items-center px-3.5 rounded-lg w-full focus-within:ring-1 focus-within:ring-[#ef4444]/30"

  return (
    <form
      hidden={hidden}
      onSubmit={submit}
      noValidate
      aria-label="Información Financiera del Solicitante"
    >
      <div className="bg-white border border-[#e2e8f0] shadow-[0_4px_10px_rgba(0,0,0,0.03)] flex flex-col gap-8 items-start p-10 rounded-2xl w-full max-w-[580px] mx-auto">
        <div className="flex flex-col gap-2 w-full">
          <h2 className="font-['Geist:Bold'] font-bold text-[#0f172a] text-[22px]">
            Información Financiera del Solicitante
          </h2>
          <p className="font-['Geist:Regular'] font-normal text-[#64748b] text-[13px] leading-[18px]">
            Ingrese los datos financieros del solicitante para completar el
            análisis de riesgo crediticio.
          </p>
        </div>

        {hasErrors && submitted && (
          <div
            role="alert"
            className="bg-[#fffbeb] border-l-4 border-[#f59e0b] flex gap-2.5 items-center p-3 rounded-lg w-full"
          >
            <div className="size-[18px] relative shrink-0" aria-hidden="true">
              <img
                alt=""
                className="absolute inset-0 size-full"
                src={ICONOS.alertaTriangulo}
              />
            </div>
            <p className="font-['Geist:Medium'] font-medium text-[#92400e] text-[13px] flex-1 min-w-0">
              Completa o corrige los campos requeridos antes de calcular: {missingFields.join(", ")}.
            </p>
          </div>
        )}

        {calculationError && (
          <div
            role="alert"
            aria-live="polite"
            aria-atomic="true"
            className="w-full rounded-lg border-l-4 border-[#f59e0b] bg-[#fffbeb] p-4 text-[#92400e]"
          >
            <p className="font-['Geist:SemiBold'] text-[13px]">
              {calculationError.detail}
            </p>
            {calculationError.camposFaltantes &&
              calculationError.camposFaltantes.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-[13px]">
                  {calculationError.camposFaltantes.map((field, index) => (
                    <li key={`${field}-${index}`}>{field}</li>
                  ))}
                </ul>
              )}
            {calculationError.variablesFaltantes &&
              calculationError.variablesFaltantes.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-[13px]">
                  {calculationError.variablesFaltantes.map((variable, index) => (
                    <li key={`${variable}-${index}`}>{variable}</li>
                  ))}
                </ul>
              )}
          </div>
        )}

        <div className="flex gap-4 items-start flex-col sm:flex-row w-full">
          {/* Ingresos */}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <label
              htmlFor={fid("ingresos")}
              className="font-['Geist:SemiBold'] font-semibold text-[#475569] text-[13px]"
            >
              Ingresos Mensuales
            </label>
            <div className={active.ingresos ? err : base}>
              <span
                className={`font-['Geist:SemiBold'] font-semibold text-sm shrink-0 ${
                  active.ingresos ? "text-[#ef4444]" : "text-[#94a3b8]"
                }`}
                aria-hidden="true"
              >
                $
              </span>
              <input
                id={fid("ingresos")}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.ingresos}
                onChange={set("ingresos")}
                onBlur={blur}
                placeholder="Ej. 3,500,000"
                aria-required="true"
                aria-invalid={!!active.ingresos}
                aria-describedby={eid("ingresos")}
                className={`bg-transparent flex-1 min-w-0 font-['Geist:Regular'] font-normal text-sm outline-none placeholder:text-[#94a3b8] ${
                  active.ingresos ? "text-[#ef4444]" : "text-[#0f172a]"
                }`}
              />
              {active.ingresos && (
                <div className="size-4 relative shrink-0" aria-hidden="true">
                  <img
                    alt=""
                    className="absolute inset-0 size-full"
                    src={ICONOS.alertaCirculo}
                  />
                </div>
              )}
            </div>
            <MensajeError id={eid("ingresos")} message={active.ingresos} />
          </div>

          {/* Egresos */}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <label
              htmlFor={fid("egresos")}
              className="font-['Geist:SemiBold'] font-semibold text-[#475569] text-[13px]"
            >
              Egresos Fijos
            </label>
            <div className={active.egresos ? err : base}>
              <span
                className={`font-['Geist:SemiBold'] font-semibold text-sm shrink-0 ${
                  active.egresos ? "text-[#ef4444]" : "text-[#94a3b8]"
                }`}
                aria-hidden="true"
              >
                $
              </span>
              <input
                id={fid("egresos")}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.egresos}
                onChange={set("egresos")}
                onBlur={blur}
                placeholder="Ej. 1,200,000"
                aria-required="true"
                aria-invalid={!!active.egresos}
                aria-describedby={eid("egresos")}
                className={`bg-transparent flex-1 min-w-0 font-['Geist:Regular'] font-normal text-sm outline-none placeholder:text-[#94a3b8] ${
                  active.egresos ? "text-[#ef4444]" : "text-[#0f172a]"
                }`}
              />
              {active.egresos && (
                <div className="size-4 relative shrink-0" aria-hidden="true">
                  <img
                    alt=""
                    className="absolute inset-0 size-full"
                    src={ICONOS.alertaCirculo}
                  />
                </div>
              )}
            </div>
            <MensajeError id={eid("egresos")} message={active.egresos} />
          </div>
        </div>

        <section className="flex w-full flex-col gap-4 border-t border-[#e2e8f0] pt-6" aria-labelledby={fid("scoring-vars-heading")}>
          <div>
            <h3 className="font-['Geist:SemiBold'] font-semibold text-[#0f172a] text-base" id={fid("scoring-vars-heading")}>
              Variables de riesgo
            </h3>
            <p className="mt-1 text-xs text-[#64748b]">
              Ingrese un valor numérico de 0 a 100 por variable. Puede dejarlo vacío; el backend indicará los datos faltantes.
            </p>
          </div>

          {variablesLoading && <p className="text-sm text-slate-600" role="status" aria-live="polite">Cargando variables activas desde el servidor…</p>}
          {variablesError && <p className="text-sm text-red-700" role="alert">{variablesError}</p>}
          {!variablesLoading && !variablesError && variables.length === 0 && (
            <p className="text-sm text-slate-600">No hay variables activas configuradas en el backend.</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {variables.map((variable) => {
              const key = `variable-${variable.id}`
              const fieldId = fid(key)
              const value = variableValues[String(variable.id)] ?? ""
              const message = active[key]
              return (
                <div className="flex flex-col gap-2" key={variable.id}>
                  <label className="font-['Geist:SemiBold'] font-semibold text-[#475569] text-[13px]" htmlFor={fieldId}>
                    {variable.nombre}
                  </label>
                  <input
                    aria-describedby={eid(key)}
                    aria-invalid={Boolean(message)}
                    className={`h-[42px] w-full rounded-lg border px-3.5 text-sm outline-none ${message ? "border-[#ef4444] bg-[#fef2f2]" : "border-[#cbd5e1] bg-white focus:border-[#2563eb]"}`}
                    id={fieldId}
                    max="100"
                    min="0"
                    onBlur={blur}
                    onChange={(event) => setVariableValue(variable.id, event.target.value)}
                    placeholder="0 a 100"
                    step="any"
                    type="number"
                    value={value}
                  />
                  <MensajeError id={eid(key)} message={message} />
                </div>
              )
            })}
          </div>
        </section>

        {currentNeto !== null && (
          <div
            className={`flex flex-col gap-1 p-4 rounded-xl border-l-4 w-full ${
              currentNeto >= 0
                ? "bg-[#ecfdf5] border-[#10b981] text-[#065f46]"
                : "bg-[#fef2f2] border-[#ef4444] text-[#991b1b]"
            }`}
            role="status"
            aria-live="polite"
          >
            <span className="font-['Geist:SemiBold'] font-semibold text-sm">
              Ingreso Neto Disponible
            </span>
            <strong className="font-['Geist:ExtraBold'] font-extrabold text-2xl">
              {formatearMoneda(currentNeto)}
            </strong>
            <span className="text-xs">Ingresos Mensuales - Egresos Fijos</span>
            {currentNeto < 0 && (
              <span role="alert" className="text-xs font-semibold">
                Los egresos superan los ingresos mensuales.
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 w-full">
          <button
            type="submit"
            disabled={isSavingFinanciero || variablesLoading || Boolean(variablesError) || variables.length === 0}
            aria-disabled={isSavingFinanciero || variablesLoading || Boolean(variablesError) || variables.length === 0}
            className={`flex gap-2 h-[46px] items-center justify-center rounded-lg w-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb] ${
              isSavingFinanciero || variablesLoading || Boolean(variablesError) || variables.length === 0
                ? "bg-[#e2e8f0] cursor-not-allowed"
                : "bg-[#2563eb] hover:bg-[#1d4ed8] cursor-pointer"
            }`}
          >
            <div className="size-4 relative shrink-0" aria-hidden="true">
              <img
                alt=""
                className={`absolute inset-0 size-full ${
                  isSavingFinanciero ? "animate-pulse" : ""
                }`}
                src={ICONOS.guardar}
              />
            </div>
            <span
              className={`font-['Geist:SemiBold'] font-semibold text-sm whitespace-nowrap ${
                  isSavingFinanciero || variablesLoading || Boolean(variablesError) || variables.length === 0
                  ? "text-[#94a3b8]"
                  : "text-white"
              }`}
            >
              {isSavingFinanciero
                ? "Guardando..."
                : "Calcular Riesgo Crediticio"}
            </span>
          </button>
          <button
            type="button"
            onClick={onBack}
            className="font-['Geist:Medium'] font-medium text-[#64748b] text-sm text-center hover:text-[#0f172a] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563eb] rounded py-1"
          >
            ← Volver al paso anterior
          </button>
          <p className="font-['Geist:Regular'] font-normal text-[#64748b] text-[11px] text-center">
            Toda la información se encripta según el estándar bancario PCI-DSS.
          </p>
        </div>
      </div>
    </form>
  )
}

// Tercera etapa: consulta consolidada de los valores financieros registrados.

function formatearMoneda(n: number) {
  return "$" + n.toLocaleString("es-CO")
}

function formatearFechaEvaluacion(value: string) {
  const date = new Date(value)
  const twoDigits = (part: number) => String(part).padStart(2, "0")
  return `${twoDigits(date.getDate())}/${twoDigits(date.getMonth() + 1)}/${date.getFullYear()} ${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`
}

function ResumenFinanciero({
  ingresos,
  egresos,
  resultado,
  onBack,
  onReset,
}: {
  ingresos: number
  egresos: number
  resultado: CalculoRiesgoResponse
  onBack: () => void
  onReset: () => void
}) {
  const neto = ingresos - egresos
  const nivelNormalizado = resultado.nivel.trim().toLocaleLowerCase()
  const riskStyle = nivelNormalizado === "bajo"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : nivelNormalizado === "medio"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : nivelNormalizado === "alto"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-slate-200 bg-slate-50 text-slate-800"

  return (
    <div className="bg-white border border-[#e2e8f0] shadow-[0_4px_10px_rgba(0,0,0,0.03)] flex flex-col gap-8 items-start p-10 rounded-2xl w-full max-w-[820px] mx-auto">
      <div className="flex flex-col gap-2 w-full">
        <h2 className="font-['Geist:Bold'] font-bold text-[#0f172a] text-[22px]">
          Resumen Financiero del Solicitante
        </h2>
        <p className="font-['Geist:Regular'] font-normal text-[#64748b] text-[13px]">
          Resultado oficial del cálculo de riesgo generado por el backend.
        </p>
      </div>

      <section className={`flex w-full flex-wrap items-center justify-between gap-5 border p-5 ${riskStyle}`} aria-live="polite">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider">Puntaje de riesgo crediticio</p>
          <p className="mt-1 text-4xl font-bold tabular-nums">{resultado.puntaje} <span className="text-base font-semibold">pts</span></p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <span className="inline-flex border border-current px-3 py-1 text-sm font-bold">Riesgo {resultado.nivel}</span>
          <p className="text-xs font-medium">Última evaluación: {formatearFechaEvaluacion(resultado.fechaCalculo)}</p>
        </div>
        <p className="w-full text-sm">{resultado.mensaje}</p>
      </section>

      <div className="flex gap-4 items-start flex-col sm:flex-row w-full">
        {/* Tarjeta de ingresos */}
        <div className="bg-[#f0fdfa] border border-[#e2e8f0] flex flex-col gap-4 items-start p-5 rounded-xl flex-1 min-w-0">
          <div className="flex gap-3 items-center w-full">
            <div
              className="bg-[#ccfbf1] flex items-center justify-center rounded-[16px] shrink-0 size-8"
              aria-hidden="true"
            >
              <div className="size-4 relative">
                <img
                  alt=""
                  className="absolute inset-0 size-full"
                  src={ICONOS.tendenciaAlza}
                />
              </div>
            </div>
            <p className="font-['Geist:SemiBold'] font-semibold text-[#475569] text-sm">
              Ingresos Mensuales
            </p>
          </div>
          <div className="flex flex-col gap-1 w-full">
            <p className="font-['Geist:Bold'] font-bold text-[#0f172a] text-[28px]">
              {formatearMoneda(ingresos)}
            </p>
            <p className="font-['Geist:Regular'] font-normal text-[#64748b] text-xs">
              COP / Mensual
            </p>
          </div>
        </div>

        {/* Tarjeta de egresos */}
        <div className="bg-[#f8fafc] border border-[#e2e8f0] flex flex-col gap-4 items-start p-5 rounded-xl flex-1 min-w-0">
          <div className="flex gap-3 items-center w-full">
            <div
              className="bg-[#fef2f2] flex items-center justify-center rounded-[16px] shrink-0 size-8"
              aria-hidden="true"
            >
              <div className="size-4 relative">
                <img
                  alt=""
                  className="absolute inset-0 size-full"
                  src={ICONOS.tendenciaBaja}
                />
              </div>
            </div>
            <p className="font-['Geist:SemiBold'] font-semibold text-[#475569] text-sm">
              Egresos Fijos
            </p>
          </div>
          <div className="flex flex-col gap-1 w-full">
            <p className="font-['Geist:Bold'] font-bold text-[#0f172a] text-[28px]">
              {formatearMoneda(egresos)}
            </p>
            <p className="font-['Geist:Regular'] font-normal text-[#64748b] text-xs">
              COP / Mensual
            </p>
          </div>
        </div>

        {/* Tarjeta de ingreso neto */}
        <div
          className={`border border-l-4 flex flex-col gap-4 items-start px-4 py-5 rounded-xl flex-1 min-w-0 ${
            neto >= 0
              ? "bg-[#ecfdf5] border-[#10b981] text-[#065f46]"
              : "bg-[#fef2f2] border-[#ef4444] text-[#991b1b]"
          }`}
        >
          <div className="flex gap-2 items-center w-full flex-wrap">
            <p className="font-['Geist:Bold'] font-bold text-sm">
              Ingreso Neto Disponible
            </p>
            <span
              className={`px-1.5 py-px rounded-full font-['Geist:SemiBold'] font-semibold text-[9px] whitespace-nowrap ${
                neto >= 0 ? "bg-[#d1fae5]" : "bg-[#fee2e2]"
              }`}
            >
              Calculado
            </span>
          </div>
          <div className="flex flex-col gap-1 w-full">
            <p className="font-['Geist:ExtraBold'] font-extrabold text-[28px]">
              {formatearMoneda(neto)}
            </p>
            <div className="flex items-center justify-between font-['Geist:Medium'] font-medium w-full">
              <span className="text-xs">COP / Mensual</span>
              <span className="text-[10px] opacity-80">
                Ingresos - Egresos = Neto
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-[#e2e8f0] w-full" aria-hidden="true" />

      <div className="flex flex-col gap-3 w-full items-center">
        <p className="font-['Geist:Regular'] font-normal text-[#64748b] text-[11px] text-center">
          Toda la información se encripta según el estándar bancario PCI-DSS.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            type="button"
            onClick={onBack}
            className="font-['Geist:Medium'] font-medium text-[#64748b] text-sm hover:text-[#0f172a] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563eb] rounded px-4 py-2"
          >
            ← Volver a datos financieros
          </button>
          <button
            type="button"
            onClick={onReset}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-['Geist:SemiBold'] font-semibold text-sm px-6 py-2 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]"
          >
            Nuevo Solicitante
          </button>
        </div>
      </div>
    </div>
  )
}

function mensajeErrorSolicitante(error: unknown) {
  if (error instanceof ApiError && error.status === 409) {
    return "El documento ya está registrado en el backend."
  }
  if (error instanceof TypeError) {
    return "No fue posible conectar con el backend."
  }
  if (error instanceof Error) return error.message
  return "No fue posible registrar el solicitante."
}

function mensajeErrorFinanciero(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 400) return error.detail
    if (error.status === 404) return "No se encontró el solicitante registrado."
    if (error.status === 409) return "El perfil financiero ya existe."
    if (error.status === 500) return "El backend reportó un error interno."
  }
  if (error instanceof TypeError) {
    return "No fue posible conectar con el backend."
  }
  if (error instanceof Error) return error.message
  return "No fue posible guardar los datos financieros."
}

// Orquesta el flujo de registro y conserva el estado entre etapas.

export default function RegistroWizard({
  embedded = false,
}: {
  embedded?: boolean
}) {
  const { token, authMode } = useAuth()
  const [step, setStep] = useState(0)
  const [toast, setToast] = useState<EstadoNotificacion>(null)
  const [isSavingSolicitante, setIsSavingSolicitante] = useState(false)
  const [isSavingFinanciero, setIsSavingFinanciero] = useState(false)
  const [solicitanteRegistrado, setSolicitanteRegistrado] =
    useState<SolicitanteResponse | null>(null)
  const [perfilFinancieroGuardado, setPerfilFinancieroGuardado] = useState(false)
  const [calculationError, setCalculationError] = useState<ApiError | null>(null)
  const [finData, setFinData] = useState<EvaluacionScore | null>(null)
  const [financialFormKey, setFinancialFormKey] = useState(0)

  const HEADER_TITLES = [
    "Sistema de Riesgo Crediticio",
    "Información Financiera",
    "Resumen del Análisis",
  ]

  const handleRegSuccess = async (data: SolicitantePayload) => {
    setIsSavingSolicitante(true)
    try {
      if (authMode !== "api" || !token) {
        throw new Error("Debe iniciar sesión con el backend para continuar.")
      }
      const solicitante = await guardarSolicitante(data, token)
      setSolicitanteRegistrado(solicitante)
      setToast({
        type: "success",
        title: "Solicitante registrado con éxito",
        sub: `ID: ${solicitante.id}`,
      })
      setStep(1)
    } catch (error) {
      setToast({
        type: "error",
        title: "No fue posible registrar el solicitante",
        sub: mensajeErrorSolicitante(error),
      })
      throw error
    } finally {
      setIsSavingSolicitante(false)
    }
  }

  const handleFinSuccess = async (
    ing: number,
    eg: number,
    variableValues: Record<string, string>,
    variables: VariableRiesgo[],
  ) => {
    setIsSavingFinanciero(true)
    try {
      if (!solicitanteRegistrado) {
        throw new Error("No hay un solicitante registrado.")
      }
      if (authMode !== "api" || !token) {
        throw new Error("Debe iniciar sesión con el backend para continuar.")
      }

      const payload: PerfilFinancieroPayload = {
        ...solicitanteRegistrado,
        ingresos: ing,
        egresos: eg,
      }
      if (!perfilFinancieroGuardado) {
        await guardarDatosFinancieros(payload, token)
        setPerfilFinancieroGuardado(true)
      }
      const valores: ValorVariableRequest[] = variables.map((variable) => {
        const rawValue = variableValues[String(variable.id)]?.trim() ?? ""
        return {
          variableId: variable.id,
          valor: rawValue === "" ? null : Number(rawValue),
        }
      })
      const resultado = await calcularRiesgoSolicitante(
        solicitanteRegistrado.id,
        { valores },
        token,
      )
      setCalculationError(null)
      setFinData({ ing, eg, resultado })
      setToast({
        type: "success",
        title: "Riesgo calculado por el backend",
        sub: resultado.mensaje,
      })
      setStep(2)
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 400 &&
        error.codigo === "DATOS_INCOMPLETOS"
      ) {
        setCalculationError(error)
        return
      }
      setCalculationError(null)
      setToast({
        type: "error",
        title: "No fue posible calcular el riesgo",
        sub: mensajeErrorFinanciero(error),
      })
    } finally {
      setIsSavingFinanciero(false)
    }
  }

  const handleReset = () => {
    setStep(0)
    setSolicitanteRegistrado(null)
    setPerfilFinancieroGuardado(false)
    setCalculationError(null)
    setFinData(null)
    setFinancialFormKey((current) => current + 1)
    setIsSavingSolicitante(false)
    setIsSavingFinanciero(false)
    setToast(null)
  }

  const wizardContent = (
    <>
      <IndicadorPasos current={step} />
      {step === 0 && (
        <PasoRegistro
          onSuccess={handleRegSuccess}
          isSavingSolicitante={isSavingSolicitante}
          token={token}
        />
      )}
      <PasoFinanciero
        key={financialFormKey}
        hidden={step !== 1}
        onSuccess={handleFinSuccess}
        onBack={() => setStep(0)}
        isSavingFinanciero={isSavingFinanciero}
        calculationError={calculationError}
        onClearCalculationError={() => setCalculationError(null)}
        token={token}
      />
      {step === 2 && finData && (
        <ResumenFinanciero
          ingresos={finData.ing}
          egresos={finData.eg}
          resultado={finData.resultado}
          onBack={() => setStep(1)}
          onReset={handleReset}
        />
      )}
    </>
  )

  if (embedded) {
    return (
      <>
        <div className="mx-auto w-full max-w-[900px]">{wizardContent}</div>
        <Notificacion toast={toast} onClose={() => setToast(null)} />
      </>
    )
  }

  return (
    <div className="bg-[#f8fafc] flex items-start min-h-screen w-full">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 min-h-screen">
        <Header title={HEADER_TITLES[step]} badge="Empresarial" />

        <main
          className="flex flex-col flex-1 items-center justify-center p-6 lg:p-12 w-full"
          id="main-content"
        >
          <div className="w-full max-w-[900px]">{wizardContent}</div>
        </main>
      </div>

      <Notificacion toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
