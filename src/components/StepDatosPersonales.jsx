import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { PROCEDENCIAS, DIRECTORA } from '../data/malla'
import { onlyLetters, onlyDigits, sanitizePPA, ppaInRange, digitsInRange } from '../utils/validators'

const CURRENT_YEAR = new Date().getFullYear()
const ANIOS = Array.from({ length: 6 }, (_, i) => Math.max(2026, CURRENT_YEAR) + i)

export default function StepDatosPersonales({ onNext }) {
  const { datosPersonales, setDatosPersonales } = useApp()
  const [touched, setTouched] = useState({})

  const errors = useMemo(() => {
    const e = {}
    if (!datosPersonales.nombres.trim()) e.nombres = 'Requerido'
    if (!datosPersonales.apellidos.trim()) e.apellidos = 'Requerido'
    if (datosPersonales.ppa && !ppaInRange(datosPersonales.ppa)) e.ppa = 'Debe estar entre 0 y 100'
    if (!digitsInRange(datosPersonales.registro, 6, 9)) e.registro = 'Debe tener entre 6 y 9 dígitos'
    if (!digitsInRange(datosPersonales.carnet, 6, 9)) e.carnet = 'Debe tener entre 6 y 9 dígitos'
    if (!datosPersonales.procedencia) e.procedencia = 'Requerido'
    if (!digitsInRange(datosPersonales.celular, 7, 8)) e.celular = 'Debe tener entre 7 y 8 dígitos'
    if (!datosPersonales.semestre) e.semestre = 'Requerido'
    if (!datosPersonales.anio) e.anio = 'Requerido'
    if (!datosPersonales.etapa) e.etapa = 'Requerido'
    return e
  }, [datosPersonales])

  const isValid = Object.keys(errors).length === 0

  function markTouched(field) {
    setTouched((t) => ({ ...t, [field]: true }))
  }

  function handleSubmit(evt) {
    evt.preventDefault()
    setTouched({
      nombres: true,
      apellidos: true,
      ppa: true,
      registro: true,
      carnet: true,
      procedencia: true,
      celular: true,
      semestre: true,
      anio: true,
      etapa: true,
    })
    if (isValid) onNext()
  }

  return (
    <form className="card-panel" onSubmit={handleSubmit} noValidate>
      <h2>Datos Personales</h2>
      <p className="subtitle">Completa tus datos para generar la solicitud de caso especial.</p>

      <div className="form-section">
        <h3 className="form-section-title">Identidad</h3>
        <div className="form-grid">
          <Field label="Nombres" error={touched.nombres && errors.nombres}>
            <input
              type="text"
              value={datosPersonales.nombres}
              onChange={(e) => setDatosPersonales({ nombres: onlyLetters(e.target.value) })}
              onBlur={() => markTouched('nombres')}
              placeholder="Joaquin"
              autoComplete="given-name"
            />
          </Field>

          <Field label="Apellidos" error={touched.apellidos && errors.apellidos}>
            <input
              type="text"
              value={datosPersonales.apellidos}
              onChange={(e) => setDatosPersonales({ apellidos: onlyLetters(e.target.value) })}
              onBlur={() => markTouched('apellidos')}
              placeholder="Chumacero"
              autoComplete="family-name"
            />
          </Field>

          <Field label="Número de carnet" error={touched.carnet && errors.carnet} hint="6 a 9 dígitos">
            <input
              type="text"
              inputMode="numeric"
              value={datosPersonales.carnet}
              onChange={(e) => setDatosPersonales({ carnet: onlyDigits(e.target.value, 9) })}
              onBlur={() => markTouched('carnet')}
              placeholder="1234567"
            />
          </Field>

          <Field label="Procedencia" error={touched.procedencia && errors.procedencia}>
            <select
              value={datosPersonales.procedencia}
              onChange={(e) => setDatosPersonales({ procedencia: e.target.value })}
              onBlur={() => markTouched('procedencia')}
            >
              <option value="">Selecciona...</option>
              {PROCEDENCIAS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.label} ({p.code})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Número de celular" error={touched.celular && errors.celular} hint="7 a 8 dígitos">
            <input
              type="text"
              inputMode="numeric"
              value={datosPersonales.celular}
              onChange={(e) => setDatosPersonales({ celular: onlyDigits(e.target.value, 8) })}
              onBlur={() => markTouched('celular')}
              placeholder="70000000"
            />
          </Field>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Datos académicos</h3>
        <div className="form-grid">
          <Field label="Número de registro" error={touched.registro && errors.registro} hint="6 a 9 dígitos">
            <input
              type="text"
              inputMode="numeric"
              value={datosPersonales.registro}
              onChange={(e) => setDatosPersonales({ registro: onlyDigits(e.target.value, 9) })}
              onBlur={() => markTouched('registro')}
              placeholder="200000000"
            />
          </Field>

          <Field label="PPA (opcional)" error={touched.ppa && errors.ppa} hint="Valor de 0 a 100, hasta 2 decimales">
            <input
              type="text"
              inputMode="decimal"
              value={datosPersonales.ppa}
              onChange={(e) => setDatosPersonales({ ppa: sanitizePPA(e.target.value) })}
              onBlur={() => markTouched('ppa')}
              placeholder="78.5"
            />
          </Field>

          <Field label="Carrera">
            <input type="text" value={datosPersonales.carrera} readOnly disabled />
          </Field>

          <Field label="Director/a de carrera" hint="Referencia editable — cambia cada gestión (2 años)">
            <input
              type="text"
              value={datosPersonales.director}
              onChange={(e) => setDatosPersonales({ director: e.target.value })}
              placeholder={DIRECTORA}
            />
          </Field>

        </div>

        <div className="inline-fields-row">
          <Field label="Semestre" error={touched.semestre && errors.semestre}>
            <select
              value={datosPersonales.semestre}
              onChange={(e) => setDatosPersonales({ semestre: e.target.value })}
              onBlur={() => markTouched('semestre')}
            >
              <option value="">Sel...</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </Field>

          <Field label="Año" error={touched.anio && errors.anio}>
            <select
              value={datosPersonales.anio}
              onChange={(e) => setDatosPersonales({ anio: e.target.value })}
              onBlur={() => markTouched('anio')}
            >
              <option value="">Sel...</option>
              {ANIOS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Etapa" error={touched.etapa && errors.etapa}>
            <select
              value={datosPersonales.etapa}
              onChange={(e) => setDatosPersonales({ etapa: e.target.value })}
              onBlur={() => markTouched('etapa')}
            >
              <option value="">Selecciona...</option>
              <option value="1">1ra etapa de caso especial</option>
              <option value="2">2da etapa de caso especial</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="actions">
        <button type="submit" className="btn-primary">
          Siguiente: Malla curricular
        </button>
      </div>
    </form>
  )
}

function Field({ label, error, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}
