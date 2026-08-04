import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { MATERIA_INDEX } from '../data/malla'
import MallaSheets, { GRADUACION_TARGETS } from './MallaSheets'

function nombreMateria(code) {
  return `${code} - ${MATERIA_INDEX[code]?.name ?? code}`
}

// El PPA determina cuántas materias se pueden "adelantar" (prerrequisito solo
// inscrito, no aprobado): 51 a 60 habilita 1, 61 a 100 habilita 2. Sin PPA cargado
// (o por debajo de 51) no se habilita ningún adelanto.
function maxAdelantoPorPPA(ppaRaw) {
  const ppa = Number(ppaRaw)
  if (!ppaRaw || Number.isNaN(ppa)) return 0
  if (ppa >= 61) return 2
  if (ppa >= 51) return 1
  return 0
}

const BRUSHES = [
  { id: 'aprobada', label: 'Aprobada', className: 'brush-verde' },
  { id: 'inscrita', label: 'Materia inscrita', className: 'brush-amarillo' },
  { id: 'especial', label: 'Solicita caso especial', className: 'brush-rojo' },
  { id: null, label: 'Borrar estado', className: 'brush-borrar' },
]

const ESTADO_LABEL = {
  aprobada: 'Aprobada',
  inscrita: 'Materia inscrita',
  especial: 'Solicita caso especial',
}

export default function StepMalla({ onNext, onBack }) {
  const { datosPersonales, materiaEstados, setMateriaEstado, resetMalla } = useApp()
  const [brush, setBrush] = useState('aprobada')
  const [editable, setEditable] = useState(false)
  const maxAdelanto = maxAdelantoPorPPA(datosPersonales.ppa)

  const especialCount = useMemo(
    () => Object.values(materiaEstados).filter((v) => v === 'especial').length,
    [materiaEstados]
  )
  const inscritaCount = useMemo(
    () => Object.values(materiaEstados).filter((v) => v === 'inscrita').length,
    [materiaEstados]
  )
  // La carta extra de 8 materias depende del total de la carga (inscritas + caso
  // especial), no solo de las que se piden como caso especial.
  const totalCargaCount = useMemo(
    () => Object.values(materiaEstados).filter((v) => v === 'inscrita' || v === 'especial').length,
    [materiaEstados]
  )
  // Materias ya marcadas como inscrita "adelantando" (con un prerrequisito todavía
  // sin aprobar) — casos excepcionales, el tope depende del PPA (ver maxAdelanto).
  const adelantoCount = useMemo(() => {
    return Object.entries(materiaEstados).filter(([code, estado]) => {
      if (estado !== 'inscrita') return false
      const materia = MATERIA_INDEX[code]
      return materia && materia.prereq.some((c) => materiaEstados[c] !== 'aprobada')
    }).length
  }, [materiaEstados])

  // Modalidad de Graduación (SAP109/VET123/ZOT223): si el 9° semestre no está 100%
  // aprobado (alguna quedó solo inscrita), marcar una de estas 3 como INSCRITA ya es
  // "adelantar" — el tope depende del PPA (ver maxAdelanto). Pedirla como CASO
  // ESPECIAL no tiene este tope: para eso existe la solicitud formal, y solo se rige
  // por el tope general de 7/8 materias (independiente del PPA). Si el 9° ya está
  // completo y aprobado, no hace falta adelanto y no aplica tope acá.
  const graduacionAdelantoCount = useMemo(() => {
    const novenoPrereq = MATERIA_INDEX[GRADUACION_TARGETS[0]]?.prereq ?? []
    const novenoCompleto = novenoPrereq.every((code) => materiaEstados[code] === 'aprobada')
    if (novenoCompleto) return 0
    return GRADUACION_TARGETS.filter((code) => materiaEstados[code] === 'inscrita').length
  }, [materiaEstados])

  // Para marcar aprobada/inscrita, el prerrequisito tiene que estar aprobado (verde).
  // Para pedir caso especial alcanza con que el prerrequisito esté inscrito (amarillo)
  // — es el caso típico de "adelantar" una materia mientras cursás la que la habilita.
  // Para Modalidad de Graduación esa misma tolerancia aplica también al pincel
  // inscrita (no solo caso especial) — el tope de cuántas se pueden adelantar así lo
  // pone graduacionAdelantoCount/maxAdelanto más abajo, no este selector.
  function estadosQueSirven(brushActivo, esGraduacion) {
    if (esGraduacion) return ['aprobada', 'inscrita']
    return brushActivo === 'especial' ? ['aprobada', 'inscrita'] : ['aprobada']
  }

  function faltantes(materia, sirven) {
    return materia.prereq.filter((code) => !sirven.includes(materiaEstados[code]))
  }

  // Para prereqAnyOf (ej. Modalidad de Graduación) alcanza con UNA de las opciones
  // en un estado que sirva, no todas — ej. terminar la línea Clínica O la línea Producción.
  function faltaAlMenosUno(materia, sirven) {
    if (!materia.prereqAnyOf) return false
    return !materia.prereqAnyOf.some((code) => sirven.includes(materiaEstados[code]))
  }

  function evaluateCard(materia) {
    const estadoActual = materiaEstados[materia.code]
    if (brush === null) return { disabled: false, reason: '' } // borrar siempre permitido
    if (estadoActual === brush) return { disabled: false, reason: '' } // click de nuevo = quitar, siempre permitido

    // No se puede cambiar directamente de un estado a otro (ej. aprobada -> inscrita,
    // o inscrita -> caso especial). Primero hay que borrar el estado actual con el
    // pincel "Borrar estado" y recién ahí marcarla con el nuevo pincel.
    if (estadoActual) {
      return {
        disabled: true,
        reason: `Ya está marcada como "${ESTADO_LABEL[estadoActual]}". Primero borrala con "Borrar estado" para poder cambiarla.`,
      }
    }

    // Tope real: 7 materias es lo normal, 8 ya pide la carta extra, pero no existe
    // la opción de 9 o 10 — ahí sí se bloquea.
    const yaContabaComoCarga = estadoActual === 'inscrita' || estadoActual === 'especial'
    if ((brush === 'inscrita' || brush === 'especial') && !yaContabaComoCarga && totalCargaCount >= 8) {
      return { disabled: true, reason: 'Ya alcanzaste el máximo de 8 materias entre inscritas y caso especial' }
    }

    // "Materia inscrita" tiene su propio techo de 7 — la 8va materia sí o sí tiene
    // que pedirse como caso especial, no se puede inscribir directamente.
    if (brush === 'inscrita' && estadoActual !== 'inscrita' && inscritaCount >= 7) {
      return {
        disabled: true,
        reason: 'Ya alcanzaste el máximo de 7 materias inscritas. La 8va tiene que ser caso especial.',
      }
    }

    const esGraduacion = GRADUACION_TARGETS.includes(materia.code)
    const sirven = estadosQueSirven(brush, esGraduacion)
    let faltan = faltantes(materia, sirven)
    const faltaOpcional = faltaAlMenosUno(materia, sirven)

    // Excepción "adelantar": para marcar inscrita, si falta un solo prerrequisito y
    // ese ya está al menos inscrito, se permite — el tope depende del PPA cargado en
    // Datos Personales (51-60 → 1, 61-100 → 2, sin PPA o menor a 51 → 0).
    if (!esGraduacion && brush === 'inscrita' && faltan.length === 1 && materiaEstados[faltan[0]] === 'inscrita') {
      if (adelantoCount < maxAdelanto) {
        faltan = []
      } else {
        return {
          disabled: true,
          reason:
            maxAdelanto === 0
              ? 'Para adelantar una materia con un prerrequisito pendiente necesitás cargar un PPA de 51 o más'
              : `Ya alcanzaste el máximo de ${maxAdelanto} materia${maxAdelanto > 1 ? 's' : ''} adelantada${maxAdelanto > 1 ? 's' : ''} según tu PPA`,
        }
      }
    }

    if (faltan.length > 0 || faltaOpcional) {
      const partes = []
      if (faltan.length > 0) partes.push(faltan.map(nombreMateria).join(', '))
      if (faltaOpcional) partes.push(`al menos una de estas (${materia.prereqAnyOf.map(nombreMateria).join(' o ')})`)
      return { disabled: true, reason: `Materia Prerequisito ${partes.join(' + ')}` }
    }

    // Tope específico de Modalidad de Graduación, solo para el pincel INSCRITA: si se
    // está "adelantando" (9° semestre no 100% aprobado), cuántas de las 3 modalidades
    // se pueden marcar como inscrita depende del tope por PPA. Caso especial no entra
    // acá — se rige solo por el tope general de 7/8 materias, sin importar el PPA.
    if (esGraduacion && brush === 'inscrita') {
      const novenoCompleto = materia.prereq.every((code) => materiaEstados[code] === 'aprobada')
      if (!novenoCompleto && graduacionAdelantoCount >= maxAdelanto) {
        return {
          disabled: true,
          reason:
            maxAdelanto === 0
              ? 'Para marcar una modalidad de graduación como inscrita sin terminar el 9° semestre completo necesitás cargar un PPA de 51 o más'
              : `Ya alcanzaste el máximo de ${maxAdelanto} modalidad${maxAdelanto > 1 ? 'es' : ''} de graduación adelantada${maxAdelanto > 1 ? 's' : ''} como inscrita según tu PPA`,
        }
      }
    }

    return { disabled: false, reason: '' }
  }

  function handleCardClick(materia) {
    const estadoActual = materiaEstados[materia.code]
    const { disabled } = evaluateCard(materia)
    if (disabled) return
    // click sobre el mismo color ya aplicado = quitar estado (toggle)
    const nextEstado = estadoActual === brush ? null : brush
    setMateriaEstado(materia.code, nextEstado)
  }

  function handleResetMalla() {
    if (window.confirm('¿Borrar todo lo pintado en la malla? Esta acción no se puede deshacer.')) {
      resetMalla()
    }
  }

  return (
    <div className="card-panel malla-panel">
      <h2>Malla curricular</h2>
      <p className="subtitle">
        Verde: materias aprobadas. Amarillo: materias inscritas. Rojo: solicitud de caso especial.
      </p>

      <div className="brush-toolbar">
        {BRUSHES.map((b) => (
          <button
            key={b.label}
            type="button"
            className={`brush-btn ${b.className} ${brush === b.id ? 'brush-active' : ''}`}
            onClick={() => setBrush(b.id)}
          >
            ● {b.label}
          </button>
        ))}
        <button type="button" className="brush-btn brush-reset" onClick={handleResetMalla}>
          ↺ Reiniciar malla
        </button>
        <button
          type="button"
          className="brush-btn no-print"
          onClick={() => setEditable((v) => !v)}
        >
          {editable ? '✕ Cerrar editor de flechas' : '✎ Editar flechas'}
        </button>
      </div>

      <MallaSheets
        materiaEstados={materiaEstados}
        evaluate={evaluateCard}
        onCardClick={handleCardClick}
        editable={editable}
      />

      <div className="especial-summary">
        <div className="especial-summary-stat">
          <span className="especial-summary-value">{especialCount}</span>
          <span className="especial-summary-label">Casos especiales solicitados</span>
        </div>
        <div className="especial-summary-alert">
          <span className="especial-summary-alert-icon">⚠️</span>
          <div className="especial-summary-alert-lines">
            <p>
              Materia inscrita: <strong>{inscritaCount}</strong>
            </p>
            <p>
              Caso especial: <strong>{especialCount}</strong>
            </p>
            {totalCargaCount > 7 && (
              <p className="especial-summary-alert-flag">Solicitud más de 7 materias</p>
            )}
          </div>
        </div>
      </div>

      <div className="actions">
        <button type="button" className="btn-secondary" onClick={onBack}>
          Atrás
        </button>
        <button type="button" className="btn-primary" onClick={onNext} disabled={especialCount === 0}>
          Siguiente: Generar carta
        </button>
      </div>
    </div>
  )
}
