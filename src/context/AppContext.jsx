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
  // enviado: si esta solicitud (con los datos actuales) ya se guardó en Supabase
  const [enviado, setEnviado] = useState(saved?.enviado ?? false)

  useEffect(() => {
    const payload = JSON.stringify({ step, datosPersonales, materiaEstados, materiaGrupos, enviado })
    localStorage.setItem(STORAGE_KEY, payload)
  }, [step, datosPersonales, materiaEstados, materiaGrupos, enviado])

  function setDatosPersonales(partial) {
    setDatosPersonalesState((prev) => ({ ...prev, ...partial }))
    setEnviado(false)
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
    setEnviado(false)
  }

  function setMateriaGrupo(code, grupo) {
    setMateriaGrupos((prev) => ({ ...prev, [code]: grupo }))
    setEnviado(false)
  }

  function marcarEnviado() {
    setEnviado(true)
  }

  function resetAll() {
    setDatosPersonalesState(defaultDatosPersonales)
    setMateriaEstados({})
    setMateriaGrupos({})
    setEnviado(false)
    setStep(1)
    localStorage.removeItem(STORAGE_KEY)
  }

  function resetMalla() {
    setMateriaEstados({})
    setMateriaGrupos({})
    setEnviado(false)
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
    enviado,
    marcarEnviado,
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
