import { useApp } from './context/AppContext'
import StepDatosPersonales from './components/StepDatosPersonales'
import StepMalla from './components/StepMalla'
import StepCarta from './components/StepCarta'

const STEPS = [
  { id: 1, label: 'Datos Personales' },
  { id: 2, label: 'Malla Curricular' },
  { id: 3, label: 'Carta' },
]

export default function App() {
  const { step, setStep } = useApp()

  return (
    <div className="app-shell">
      <header className="app-header no-print">
        <img src="/logo.png" alt="Logo Medicina Veterinaria y Zootecnia" className="app-logo" />
        <div className="app-header-text">
          <h1>Casos Especiales — UAGRM</h1>
          <p>Facultad de Ciencias Veterinarias · Medicina Veterinaria y Zootecnia</p>
        </div>
        <img src="/logo2.png" alt="" className="app-logo" />
      </header>

      <ol className="stepper no-print">
        {STEPS.map((s) => (
          <li key={s.id} className={step === s.id ? 'active' : step > s.id ? 'done' : ''}>
            <span className="stepper-index">{s.id}</span>
            <span className="stepper-label">{s.label}</span>
          </li>
        ))}
      </ol>

      <main>
        {step === 1 && <StepDatosPersonales onNext={() => setStep(2)} />}
        {step === 2 && <StepMalla onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <StepCarta onBack={() => setStep(2)} />}
      </main>

      <footer className="app-footer no-print">
        Creado por:{' '}
        <a href="https://github.com/JosecaFict" target="_blank" rel="noopener noreferrer">
          JoseFicct
        </a>{' '}
        · 02/08/2026
      </footer>
    </div>
  )
}
