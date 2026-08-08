import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import * as XLSX from 'xlsx'

export default function AdminPage() {
  const [session, setSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoadingSession(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (loadingSession) {
    return (
      <div className="app-shell">
        <p>Cargando...</p>
      </div>
    )
  }

  return <div className="app-shell admin-shell">{session ? <Panel session={session} /> : <LoginForm />}</div>
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(evt) {
    evt.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError('Correo o contraseña incorrectos.')
  }

  return (
    <form className="card-panel admin-login" onSubmit={handleSubmit} noValidate>
      <h2>Panel de administración</h2>
      <p className="subtitle">Casos Especiales — UAGRM</p>
      <label className="field">
        <span className="field-label">Correo</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />
      </label>
      <label className="field">
        <span className="field-label">Contraseña</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      {error && <p className="field-error">{error}</p>}
      <div className="actions">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </div>
    </form>
  )
}

function Panel({ session }) {
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <>
      <header className="app-header admin-header no-print">
        <div className="app-header-text">
          <h1>Panel de administración</h1>
          <p>{session.user.email}</p>
        </div>
        <button type="button" className="btn-secondary" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </header>

      <PeriodosSection />
      <ReporteSection />
    </>
  )
}

const PERIODO_VACIO = {
  semestre: '',
  anio: '',
  etapa: '',
  solicitud_inicio: '',
  solicitud_fin: '',
  entrega_inicio: '',
  entrega_fin: '',
  ejecucion_inicio: '',
  ejecucion_fin: '',
}

function PeriodosSection() {
  const [periodos, setPeriodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(PERIODO_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function cargarPeriodos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('periodos')
      .select('*')
      .order('anio', { ascending: false })
      .order('semestre', { ascending: false })
      .order('etapa', { ascending: false })
    if (!error) setPeriodos(data || [])
    setLoading(false)
  }

  useEffect(() => {
    cargarPeriodos()
  }, [])

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function aIso(valorDatetimeLocal) {
    return valorDatetimeLocal ? new Date(valorDatetimeLocal).toISOString() : null
  }

  async function handleCrear(evt) {
    evt.preventDefault()
    setError('')
    if (!form.solicitud_inicio || !form.solicitud_fin) {
      setError('Las fechas de solicitud (inicio y fin) son obligatorias.')
      return
    }
    setGuardando(true)
    const { error } = await supabase.from('periodos').insert({
      semestre: Number(form.semestre),
      anio: Number(form.anio),
      etapa: Number(form.etapa),
      solicitud_inicio: aIso(form.solicitud_inicio),
      solicitud_fin: aIso(form.solicitud_fin),
      entrega_inicio: aIso(form.entrega_inicio),
      entrega_fin: aIso(form.entrega_fin),
      ejecucion_inicio: aIso(form.ejecucion_inicio),
      ejecucion_fin: aIso(form.ejecucion_fin),
    })
    setGuardando(false)
    if (error) {
      setError('No se pudo guardar: ' + error.message)
      return
    }
    setForm(PERIODO_VACIO)
    cargarPeriodos()
  }

  async function handleEliminar(id) {
    if (!window.confirm('¿Borrar este periodo?')) return
    await supabase.from('periodos').delete().eq('id', id)
    cargarPeriodos()
  }

  return (
    <section className="card-panel admin-section">
      <h2>Fechas por etapa</h2>
      <p className="subtitle">
        Define cuándo se abre y cierra cada etapa. Mientras esté dentro del rango de "Solicitud", el formulario
        público queda habilitado.
      </p>

      <form onSubmit={handleCrear} noValidate>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">Semestre</span>
            <select value={form.semestre} onChange={(e) => updateField('semestre', e.target.value)} required>
              <option value="">Sel...</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Año</span>
            <input
              type="number"
              value={form.anio}
              onChange={(e) => updateField('anio', e.target.value)}
              placeholder="2026"
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Etapa</span>
            <select value={form.etapa} onChange={(e) => updateField('etapa', e.target.value)} required>
              <option value="">Sel...</option>
              <option value="1">1ra etapa</option>
              <option value="2">2da etapa</option>
            </select>
          </label>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Solicitud de caso especial (obligatorio)</h3>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Inicio</span>
              <input
                type="datetime-local"
                value={form.solicitud_inicio}
                onChange={(e) => updateField('solicitud_inicio', e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Fin</span>
              <input
                type="datetime-local"
                value={form.solicitud_fin}
                onChange={(e) => updateField('solicitud_fin', e.target.value)}
                required
              />
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Entrega de documentos (informativo)</h3>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Inicio</span>
              <input
                type="datetime-local"
                value={form.entrega_inicio}
                onChange={(e) => updateField('entrega_inicio', e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Fin</span>
              <input
                type="datetime-local"
                value={form.entrega_fin}
                onChange={(e) => updateField('entrega_fin', e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Ejecución de casos especiales — estimado (informativo)</h3>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Inicio</span>
              <input
                type="datetime-local"
                value={form.ejecucion_inicio}
                onChange={(e) => updateField('ejecucion_inicio', e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Fin</span>
              <input
                type="datetime-local"
                value={form.ejecucion_fin}
                onChange={(e) => updateField('ejecucion_fin', e.target.value)}
              />
            </label>
          </div>
        </div>

        {error && <p className="field-error">{error}</p>}
        <div className="actions">
          <button type="submit" className="btn-primary" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar periodo'}
          </button>
        </div>
      </form>

      <h3 className="form-section-title">Periodos cargados</h3>
      {loading ? (
        <p>Cargando...</p>
      ) : periodos.length === 0 ? (
        <p className="subtitle">Todavía no cargaste ningún periodo.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sem/Año/Etapa</th>
                <th>Solicitud</th>
                <th>Entrega docs.</th>
                <th>Ejecución</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {periodos.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.semestre}/{p.anio} — etapa {p.etapa}
                  </td>
                  <td>
                    {formatRango(p.solicitud_inicio, p.solicitud_fin)}
                  </td>
                  <td>{formatRango(p.entrega_inicio, p.entrega_fin)}</td>
                  <td>{formatRango(p.ejecucion_inicio, p.ejecucion_fin)}</td>
                  <td>
                    <button type="button" className="btn-danger" onClick={() => handleEliminar(p.id)}>
                      Borrar
                    </button>
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

function formatRango(inicio, fin) {
  if (!inicio && !fin) return '—'
  const fmt = (iso) => (iso ? new Date(iso).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }) : '?')
  return `${fmt(inicio)} → ${fmt(fin)}`
}

function ReporteSection() {
  const [descargando, setDescargando] = useState(false)
  const [error, setError] = useState('')

  async function handleDescargar() {
    setDescargando(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('solicitud_materias')
        .select('sigla, grupo, solicitudes(id, nombre, apellidos, carnet, celular, registro, ppa, semestre, anio, etapa)')
      if (error) throw error

      const filasCrudas = data || []
      const conteoPorSolicitud = new Map()
      for (const fila of filasCrudas) {
        const id = fila.solicitudes?.id
        conteoPorSolicitud.set(id, (conteoPorSolicitud.get(id) || 0) + 1)
      }

      const filas = filasCrudas
        .map((fila) => {
          const s = fila.solicitudes || {}
          return {
            id: s.id ?? '',
            nombre: s.nombre ?? '',
            apellidos: s.apellidos ?? '',
            carnet: s.carnet ?? '',
            celular: s.celular ?? '',
            registro: s.registro ?? '',
            ppa: s.ppa ?? '',
            sem: s.semestre ?? '',
            año: s.anio ?? '',
            etapa: s.etapa ?? '',
            Solicitud: conteoPorSolicitud.get(s.id) ?? '',
            sigla: fila.sigla,
            grupo: fila.grupo,
          }
        })
        .sort((a, b) => a.apellidos.localeCompare(b.apellidos) || a.nombre.localeCompare(b.nombre))

      const ws = XLSX.utils.json_to_sheet(filas)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Casos especiales')
      const fechaArchivo = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `casos_especiales_${fechaArchivo}.xlsx`)
    } catch (err) {
      console.error(err)
      setError('No se pudo generar el Excel. Intenta de nuevo.')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <section className="card-panel admin-section">
      <h2>Reporte</h2>
      <p className="subtitle">Descarga todas las solicitudes guardadas hasta ahora, una fila por materia.</p>
      {error && <p className="field-error">{error}</p>}
      <div className="actions">
        <button type="button" className="btn-primary" onClick={handleDescargar} disabled={descargando}>
          {descargando ? 'Generando...' : 'Descargar Excel'}
        </button>
      </div>
    </section>
  )
}
