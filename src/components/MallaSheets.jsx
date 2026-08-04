import { useEffect, useMemo, useRef, useState } from 'react'
import { SEMESTRES, MODALIDAD_GRADUACION, ELECTIVAS, MATERIA_INDEX, PLAN } from '../data/malla'
import MateriaCard from './MateriaCard'
import PrereqArrows from './PrereqArrows'

const SEMESTRES_DESC = [...SEMESTRES].reverse() // Noveno arriba, Primero abajo (como el póster)
const ELECTIVA_ROWS_DESC = [4, 3, 2, 1, 0] // último paso de la línea arriba, primero abajo
// Cada paso de la línea electiva corresponde a un semestre (5° a 9°), en el mismo orden que las materias.
const ELECTIVA_SEMESTRES = ['Quinto', 'Sexto', 'Séptimo', 'Octavo', 'Noveno']

// Estos prerrequisitos cruzan a otra sección (Electivas) y quedan muy lejos en la
// página — se siguen exigiendo como requisito, pero no se dibuja la flecha.
const SKIP_DRAW_EDGES = new Set(['VET108-VET118', 'ZOT104-ZOT218'])

// Origen y destino ya quedan en la misma columna — se fuerza a ir recta, sin el
// abanico automático que usan las demás líneas que salen del mismo origen.
const STRAIGHT_EDGES = new Set([
  'ZOT108-ZOT109',
  'SAP105-ZOT113',
  'VET116-ZOT111',
  'SAP106-ZOT112',
  'VET108-VET111',
])

// Líneas que ya están casi listas: solo se muestran los campos que todavía hacen
// falta tocar, el resto queda oculto (aunque el valor guardado se sigue aplicando).
const PARTIAL_EDGES = {}

// Líneas ya afinadas y confirmadas — se dejan de mostrar en el editor (sus ajustes
// guardados se siguen aplicando igual, solo que ya no aparecen para tocarlas por error).
const LOCKED_EDGES = new Set([
  'ZOT108-ZOT115',
  'ZOT108-ZOT113',
  'ZOT108-ZOT112',
  'ZOT108-ZOT114',
  'ZOT108-ZOT111',
  'SAP106-SAP108',
  'VET108-VET113',
])

// Las 5 materias del 9° semestre abren las 3 modalidades de graduación (15 líneas).
// Dibujarlas todas por separado se ve como un enredo — se muestran como un solo
// "bus": las 5 se juntan en una barra y de ahí salen 3 líneas hacia cada modalidad.
const GRADUACION_TARGETS = ['SAP109', 'VET123', 'ZOT223']

// Prerrequisitos que saltan una fila completa: si se dibujan en línea recta cruzan
// por encima de materias intermedias. Cada una se enruta por el hueco vacío entre
// dos materias puntuales de la fila que atraviesan (nunca sobre una card), y cada
// una tiene su propio color para poder distinguirlas cuando salen del mismo hub.
const AVOID_EDGES = {
  'ZOT108-ZOT115': { through: ['SAP106', 'ZOT109'], color: '#2563eb', endLaneOffset: 5 },
  'ZOT108-ZOT113': {
    through: ['ZOT110', 'SAP105'],
    color: '#7c3aed',
    startOffset: -6,
    laneOffset: -2,
    endLaneOffset: 17,
    endOffset: 15,
  },
  'ZOT108-ZOT112': {
    through: ['SAP105', 'SAP106'],
    color: '#0891b2',
    startOffset: -7,
    laneOffset: -4,
    endLaneOffset: 16,
    endOffset: 14,
  },
  'ZOT108-ZOT114': { through: ['ZOT109', 'VET116'], color: '#ea580c', laneOffset: -4, endLaneOffset: 7 },
  'ZOT108-ZOT111': {
    offset: 0,
    color: '#be185d',
    laneOffset: -20,
    gapOffset: -16,
    endLaneOffset: 6,
    endOffset: 42,
  },
  'SAP106-SAP108': { through: ['ZOT115', 'ZOT113'], color: '#92400e', gapOffset: -2, endLaneOffset: 8 },
  'VET108-VET113': { through: ['ZOT106', 'VET111'], color: '#0f766e', endLaneOffset: 6 },
}

// Ajustes manuales que el usuario puede hacer en vivo desde el "Editor de flechas"
// (solo en el paso de la malla). Se guardan en localStorage para que también se
// reflejen en la vista de solo lectura de la carta, en el print y en el Word.
const OVERRIDES_KEY = 'casos-especiales-uagrm:arrow-overrides'

function loadOverrides() {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function buildConfigSnippet(overrides) {
  const lines = Object.entries(AVOID_EDGES).map(([key, base]) => {
    const merged = { ...base, ...(overrides[key] || {}) }
    const parts = []
    if (merged.through) parts.push(`through: [${merged.through.map((c) => `'${c}'`).join(', ')}]`)
    if (merged.offset !== undefined) parts.push(`offset: ${merged.offset}`)
    if (merged.color) parts.push(`color: '${merged.color}'`)
    if (merged.laneOffset) parts.push(`laneOffset: ${merged.laneOffset}`)
    if (merged.gapOffset) parts.push(`gapOffset: ${merged.gapOffset}`)
    if (merged.startOffset) parts.push(`startOffset: ${merged.startOffset}`)
    if (merged.endOffset) parts.push(`endOffset: ${merged.endOffset}`)
    if (merged.endLaneOffset) parts.push(`endLaneOffset: ${merged.endLaneOffset}`)
    return `  '${key}': { ${parts.join(', ')} },`
  })
  return `const AVOID_EDGES = {\n${lines.join('\n')}\n}`
}

// Renderiza las dos hojas de la malla (principal + electivas). Se usa tanto en el
// paso interactivo (con `evaluate`/`onCardClick`) como en modo solo-lectura dentro
// de la carta, para que la malla se pueda imprimir/guardar junto con la solicitud.
export default function MallaSheets({ materiaEstados, evaluate, onCardClick, editable }) {
  const containerRef = useRef(null)
  const cardRefs = useRef({})
  const [overrides, setOverrides] = useState(loadOverrides)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides))
  }, [overrides])

  function updateOverride(key, partial) {
    setOverrides((prev) => ({ ...prev, [key]: { ...prev[key], ...partial } }))
  }

  function resetOverride(key) {
    setOverrides((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function resetAllOverrides() {
    if (window.confirm('¿Borrar todos los ajustes manuales de las flechas y volver al diseño original?')) {
      setOverrides({})
    }
  }

  async function handleCopyConfig() {
    const text = buildConfigSnippet(overrides)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copiá esta configuración y pegámela en el chat:', text)
    }
  }

  const edges = useMemo(() => {
    const list = []
    for (const code of Object.keys(MATERIA_INDEX)) {
      if (GRADUACION_TARGETS.includes(code)) continue // se dibujan como bus, no como edges
      for (const prereqCode of MATERIA_INDEX[code].prereq) {
        const key = `${prereqCode}-${code}`
        if (SKIP_DRAW_EDGES.has(key)) continue
        const base = AVOID_EDGES[key]
        const avoid = base ? { ...base, ...(overrides[key] || {}) } : undefined
        list.push({ from: prereqCode, to: code, avoid, straight: STRAIGHT_EDGES.has(key) })
      }
    }
    return list
  }, [overrides])

  const graduacionBus = useMemo(
    () => ({ sources: MODALIDAD_GRADUACION.materias[0].prereq, targets: GRADUACION_TARGETS }),
    []
  )

  function renderMateria(materia, variant) {
    const { disabled, reason } = evaluate ? evaluate(materia) : { disabled: false, reason: '' }
    return (
      <MateriaCard
        key={materia.code}
        materia={materia}
        estado={materiaEstados[materia.code]}
        disabled={disabled}
        disabledReason={reason}
        onClick={onCardClick ? () => onCardClick(materia) : undefined}
        variant={variant}
        cardRef={(el) => {
          cardRefs.current[materia.code] = el
        }}
      />
    )
  }

  return (
    <>
      {editable && (
        <div className="arrow-lab no-print">
          <div className="arrow-lab-header">
            <h4>Editor de flechas</h4>
            <div className="arrow-lab-actions">
              <button type="button" className="arrow-lab-btn" onClick={handleCopyConfig}>
                {copied ? 'Copiado ✓' : 'Copiar configuración'}
              </button>
              <button type="button" className="arrow-lab-btn arrow-lab-btn-danger" onClick={resetAllOverrides}>
                Reiniciar todo
              </button>
            </div>
          </div>
          <p className="arrow-lab-hint">
            Movés "Altura" y "Posición" hasta que cada línea se distinga bien de las demás. Los
            cambios se ven al toque abajo y quedan guardados solos. Cuando estés conforme, tocá
            "Copiar configuración" y pegame el resultado en el chat para dejarlo fijo.
          </p>
          <div className="arrow-lab-rows">
            {Object.entries(AVOID_EDGES)
              .filter(([key]) => !LOCKED_EDGES.has(key))
              .map(([key, base]) => {
              const ov = overrides[key] || {}
              const merged = { ...base, ...ov }
              const [from, to] = key.split('-')
              const onlyFields = PARTIAL_EDGES[key] || null
              const showField = (f) => !onlyFields || onlyFields.includes(f)
              const LR_FIELDS = new Set(['startOffset', 'gapOffset', 'endOffset'])
              const fieldLabel = (f, normal) => {
                if (!onlyFields) return normal
                const step = onlyFields.indexOf(f)
                if (step === -1) return normal
                return `${step + 1}. ${LR_FIELDS.has(f) ? 'Izquierda / Derecha' : 'Arriba / Abajo'}`
              }
              return (
                <div key={key} className="arrow-lab-row">
                  <span className="arrow-lab-swatch" style={{ background: merged.color }} />
                  <span className="arrow-lab-label">
                    {from} → {to}
                    <em> {MATERIA_INDEX[to]?.name ?? ''}</em>
                  </span>
                  {showField('color') && (
                    <label className="arrow-lab-field">
                      Color
                      <input
                        type="color"
                        value={merged.color || '#1a1a1a'}
                        onChange={(e) => updateOverride(key, { color: e.target.value })}
                      />
                    </label>
                  )}
                  {showField('startOffset') && (
                    <label className="arrow-lab-field">
                      {fieldLabel('startOffset', 'Salida')}
                      <input
                        type="number"
                        step="1"
                        value={merged.startOffset ?? 0}
                        onChange={(e) => updateOverride(key, { startOffset: Number(e.target.value) })}
                      />
                    </label>
                  )}
                  {showField('laneOffset') && (
                    <label className="arrow-lab-field">
                      {fieldLabel('laneOffset', 'Altura salida')}
                      <input
                        type="number"
                        step="1"
                        value={merged.laneOffset ?? 0}
                        onChange={(e) => updateOverride(key, { laneOffset: Number(e.target.value) })}
                      />
                    </label>
                  )}
                  {showField('gapOffset') && (
                    <label className="arrow-lab-field">
                      {fieldLabel('gapOffset', 'Izquierda / Derecha')}
                      <input
                        type="number"
                        step="1"
                        value={merged.gapOffset ?? 0}
                        onChange={(e) => updateOverride(key, { gapOffset: Number(e.target.value) })}
                      />
                    </label>
                  )}
                  {showField('endLaneOffset') && (
                    <label className="arrow-lab-field">
                      {fieldLabel('endLaneOffset', 'Altura llegada')}
                      <input
                        type="number"
                        step="1"
                        value={merged.endLaneOffset ?? 0}
                        onChange={(e) => updateOverride(key, { endLaneOffset: Number(e.target.value) })}
                      />
                    </label>
                  )}
                  {!base.through && showField('offset') && (
                    <label className="arrow-lab-field">
                      Carril externo
                      <input
                        type="number"
                        step="1"
                        value={merged.offset ?? 0}
                        onChange={(e) => updateOverride(key, { offset: Number(e.target.value) })}
                      />
                    </label>
                  )}
                  {showField('endOffset') && (
                    <label className="arrow-lab-field">
                      {fieldLabel('endOffset', 'Llegada')}
                      <input
                        type="number"
                        step="1"
                        value={merged.endOffset ?? 0}
                        onChange={(e) => updateOverride(key, { endOffset: Number(e.target.value) })}
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    className="arrow-lab-row-reset"
                    title="Volver esta línea a su valor original"
                    onClick={() => resetOverride(key)}
                  >
                    ↺
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="malla-scroll">
      <div className="malla-content" ref={containerRef}>
        <PrereqArrows containerRef={containerRef} cardRefs={cardRefs} edges={edges} bus={graduacionBus} />

        <div className="hoja-oficio">
          <div className="hoja-titlebar">
            <img src="/logo.png" alt="" className="hoja-logo" />
            <div className="hoja-title-text">
              <h3>Malla curricular de Medicina Veterinaria Zootecnia</h3>
              <p>Plan {PLAN}</p>
              <p className="hoja-subtitle">{MODALIDAD_GRADUACION.label}</p>
            </div>
            <img src="/logo2.png" alt="" className="hoja-logo" />
          </div>

          <section className="semestre-block">
            <div className="materia-grid materia-grid-3">
              {MODALIDAD_GRADUACION.materias.map((m) => renderMateria(m))}
            </div>
          </section>

          {SEMESTRES_DESC.map((sem) => {
            const [ordinal, palabra] = sem.label.split(' ')
            return (
              <section key={sem.numero} className="semestre-row">
                <div className="semestre-label">
                  <span>{ordinal}</span>
                  <span>{palabra}</span>
                </div>
                <div className="materia-grid materia-grid-5">{sem.materias.map((m) => renderMateria(m))}</div>
              </section>
            )
          })}
        </div>

        <div className="hoja-oficio">
          <div className="hoja-titlebar">
            <img src="/logo.png" alt="" className="hoja-logo" />
            <div className="hoja-title-text">
              <h3>Malla curricular de Medicina Veterinaria Zootecnia</h3>
              <p>Plan {PLAN}</p>
            </div>
            <img src="/logo2.png" alt="" className="hoja-logo" />
          </div>

          <h3 className="titulo-electivas">Electivas</h3>

          <section className="semestre-block electivas-block">
            <div className="electivas-chain">
              <div className="electiva-headers">
                <span />
                <span className="electiva-col-spacer" />
                <span>{ELECTIVAS.lineas[0].nombre}</span>
                <span className="electiva-col-spacer" />
                <span>{ELECTIVAS.lineas[1].nombre}</span>
              </div>
              {ELECTIVA_ROWS_DESC.map((rowIndex) => (
                <div key={rowIndex} className="electiva-row">
                  <div className="electiva-semestre">
                    <span>{ELECTIVA_SEMESTRES[rowIndex]}</span>
                    <span>Semestre</span>
                  </div>
                  <span className="electiva-col-spacer" />
                  {renderMateria(ELECTIVAS.lineas[0].materias[rowIndex], 'electiva')}
                  <span className="electiva-col-spacer" />
                  {renderMateria(ELECTIVAS.lineas[1].materias[rowIndex], 'electiva')}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      </div>
    </>
  )
}

export { GRADUACION_TARGETS }
