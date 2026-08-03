import { createContext, useContext, useEffect, useState } from 'react'
import { CARRERA, DIRECTORA } from '../data/malla'

const STORAGE_KEY = 'casos-especiales-uagrm:v1'

const defaultDatosPersonales = {
  nombres: '',
  apellidos: '',
  ppa: '',
  registro: '',
  carnet: '',
  procedencia: '',
  celular: '',
  director: DIRECTORA,
  carrera: CARRERA,
  semestre: '',
  anio: '',
  etapa: '',
}

function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const saved = loadInitialState()

  const [step, setStep] = useState(saved?.step ?? 1)
  const [datosPersonales, setDatosPersonalesState] = useState({
    ...defaultDatosPersonales,
    ...(saved?.datosPersonales ?? {}),
  })
  // materiaEstados: { [code]: 'aprobada' | 'inscrita' | 'especial' }
  const [materiaEstados, setMateriaEstados] = useState(saved?.materiaEstados ?? {})
  // materiaGrupos: { [code]: string } — grupo declarado por el estudiante para la carta
  const [materiaGrupos, setMateriaGrupos] = useState(saved?.materiaGrupos ?? {})

  useEffect(() => {
    const payload = JSON.stringify({ step, datosPersonales, materiaEstados, materiaGrupos })
    localStorage.setItem(STORAGE_KEY, payload)
  }, [step, datosPersonales, materiaEstados, materiaGrupos])

  function setDatosPersonales(partial) {
    setDatosPersonalesState((prev) => ({ ...prev, ...partial }))
  }

  function setMateriaEstado(code, estado) {
    setMateriaEstados((prev) => {
      const next = { ...prev }
      if (!estado) {
        delete next[code]
      } else {
        next[code] = estado
      }
      return next
    })
  }

  function setMateriaGrupo(code, grupo) {
    setMateriaGrupos((prev) => ({ ...prev, [code]: grupo }))
  }

  function resetAll() {
    setDatosPersonalesState(defaultDatosPersonales)
    setMateriaEstados({})
    setMateriaGrupos({})
    setStep(1)
    localStorage.removeItem(STORAGE_KEY)
  }

  function resetMalla() {
    setMateriaEstados({})
    setMateriaGrupos({})
  }

  const value = {
    step,
    setStep,
    datosPersonales,
    setDatosPersonales,
    materiaEstados,
    setMateriaEstado,
    materiaGrupos,
    setMateriaGrupo,
    resetAll,
    resetMalla,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}
