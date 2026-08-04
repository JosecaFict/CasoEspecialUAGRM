import { useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { MATERIA_INDEX, DIRECTORA, FACULTAD, CARRERA } from '../data/malla'
import { formatFechaLarga } from '../utils/date'
import MallaSheets from './MallaSheets'

const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'AB', 'CD', 'X', 'Z']

export default function StepCarta({ onBack }) {
  const { datosPersonales, materiaEstados, materiaGrupos, setMateriaGrupo, setStep } = useApp()
  const [descargandoWord, setDescargandoWord] = useState(false)
  const mallaRef = useRef(null)

  const especiales = useMemo(() => {
    return Object.entries(materiaEstados)
      .filter(([, estado]) => estado === 'especial')
      .map(([code]) => ({ code, ...MATERIA_INDEX[code] }))
      .sort((a, b) => (a.semestre ?? 99) - (b.semestre ?? 99) || a.code.localeCompare(b.code))
  }, [materiaEstados])

  // El máximo normal es 7 materias entre inscritas y caso especial; superarlo
  // requiere la carta de autorización adicional.
  const totalCargaCount = useMemo(
    () => Object.values(materiaEstados).filter((v) => v === 'inscrita' || v === 'especial').length,
    [materiaEstados]
  )

  const nombreCompleto = `${datosPersonales.nombres} ${datosPersonales.apellidos}`.trim()
  const fecha = formatFechaLarga()
  const necesitaCartaOcho = totalCargaCount > 7

  function handlePrint() {
    window.print()
  }

  async function handleDownloadWord() {
    setDescargandoWord(true)
    try {
      const [{ downloadCartasWord }, { default: html2canvas }] = await Promise.all([
        import('../utils/wordExport'),
        import('html2canvas'),
      ])

      // Las flechas de prerrequisito son un <svg> "hermano" de las hojas (no hijo de
      // ninguna) — si se captura cada .hoja-oficio por separado, el SVG queda afuera
      // y no sale en la imagen. Por eso se captura todo .malla-content de una sola vez
      // (hojas + flechas juntas) y después se recorta cada hoja de esa captura completa.
      const mallaImages = []
      const mallaContentEl = mallaRef.current ? mallaRef.current.querySelector('.malla-content') : null
      const hojas = mallaContentEl ? mallaContentEl.querySelectorAll('.hoja-oficio') : []
      if (mallaContentEl && hojas.length) {
        const scale = 2
        const fullCanvas = await html2canvas(mallaContentEl, { scale, backgroundColor: '#ffffff' })
        const containerRect = mallaContentEl.getBoundingClientRect()
        for (const hoja of hojas) {
          const hojaRect = hoja.getBoundingClientRect()
          const sx = (hojaRect.left - containerRect.left) * scale
          const sy = (hojaRect.top - containerRect.top) * scale
          const sw = hojaRect.width * scale
          const sh = hojaRect.height * scale

          const cropCanvas = document.createElement('canvas')
          cropCanvas.width = sw
          cropCanvas.height = sh
          cropCanvas.getContext('2d').drawImage(fullCanvas, sx, sy, sw, sh, 0, 0, sw, sh)

          const dataUrl = cropCanvas.toDataURL('image/png')
          const buffer = await (await fetch(dataUrl)).arrayBuffer()
          mallaImages.push({ buffer, width: cropCanvas.width, height: cropCanvas.height })
        }
      }

      await downloadCartasWord({
        datosPersonales,
        especiales,
        materiaGrupos,
        nombreCompleto,
        fecha,
        necesitaCartaOcho,
        mallaImages,
      })
    } catch (err) {
      console.error(err)
      alert('No se pudo generar el Word. Intenta de nuevo.')
    } finally {
      setDescargandoWord(false)
    }
  }

  return (
    <div className="card-panel carta-step">
      <div className="no-print">
        <h2>Carta de solicitud</h2>
        <p className="subtitle">
          Revisa los datos. La carta se genera automáticamente con lo ingresado en los pasos anteriores.
        </p>
        {especiales.length === 0 && (
          <p className="field-error">No marcaste ninguna materia como "caso especial" en la malla.</p>
        )}
      </div>

      {especiales.length > 0 && (
        <>
          <CartaNormal
            datosPersonales={datosPersonales}
            especiales={especiales}
            materiaGrupos={materiaGrupos}
            setMateriaGrupo={setMateriaGrupo}
            nombreCompleto={nombreCompleto}
            fecha={fecha}
          />

          {necesitaCartaOcho && (
            <CartaOcho datosPersonales={datosPersonales} nombreCompleto={nombreCompleto} fecha={fecha} />
          )}

          <div className="no-print">
            <h2>Malla curricular</h2>
            <p className="subtitle">Así queda tu malla — se imprime junto con la carta.</p>
          </div>
          <div ref={mallaRef}>
            <MallaSheets materiaEstados={materiaEstados} />
          </div>
        </>
      )}

      <div className="actions no-print">
        <button type="button" className="btn-secondary" onClick={onBack}>
          Atrás
        </button>
        {especiales.length > 0 && (
          <button type="button" className="btn-primary" onClick={handlePrint}>
            Imprimir / Guardar como PDF
          </button>
        )}
        {especiales.length > 0 && (
          <button type="button" className="btn-secondary" onClick={handleDownloadWord} disabled={descargandoWord}>
            {descargandoWord ? 'Generando Word...' : 'Descargar Word'}
          </button>
        )}
        <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
          Volver al inicio
        </button>
      </div>
    </div>
  )
}

function CartaNormal({ datosPersonales, especiales, materiaGrupos, setMateriaGrupo, nombreCompleto, fecha }) {
  const requiereFirmaDocente = datosPersonales.etapa === '2'

  return (
    <article className="carta carta-normal">
      <div className="carta-letterhead">
        <img src="/logo.png" alt="" className="carta-logo" />
        <p className="carta-fecha">
          Santa Cruz {fecha.dia} de {fecha.mes} de {fecha.anio}
        </p>
      </div>

      <p className="carta-destinatario">
        A: {datosPersonales.director || DIRECTORA}
        <br />
        <strong>DIRECTORA DE LA CARRERA DE MEDICINA</strong>
        <br />
        <strong>VETERINARIA Y ZOOTECNIA.</strong>
        <br />
        <strong>{FACULTAD}</strong>
      </p>

      <p className="carta-ref">
        <strong>Ref.:</strong> Solicitud de Adición de Materias como caso Especial.
      </p>

      <p className="carta-parrafo">
        Mediante la presente, me dirijo a su autoridad a objeto de solicitar que su persona instruya a la sección
        correspondiente, la inscripción de materias como caso especial que corresponde al semestre{' '}
        <strong>{datosPersonales.semestre || '___'}/{datosPersonales.anio || '202__'}</strong>.
      </p>

      <table className="carta-tabla">
        <thead>
          <tr>
            <th className="col-sigla">SIGLA</th>
            <th>MATERIA</th>
            <th className="col-grupo">GRUPO</th>
            {requiereFirmaDocente && <th className="col-firma">FIRMA DOCENTE</th>}
          </tr>
        </thead>
        <tbody>
          {especiales.map((m) => (
            <tr key={m.code}>
              <td className="col-sigla">{m.code}</td>
              <td>{m.name}</td>
              <td className="no-print-border col-grupo">
                <select
                  className="tabla-input no-print-input"
                  value={materiaGrupos[m.code] ?? ''}
                  onChange={(e) => setMateriaGrupo(m.code, e.target.value)}
                >
                  <option value=""></option>
                  {GRUPOS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <span className="print-only-value">{materiaGrupos[m.code] ?? ''}</span>
              </td>
              {requiereFirmaDocente && <td className="col-firma"></td>}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="carta-parrafo">Para respaldar la presente solicitud, adjunto la siguiente documentación:</p>
      <ul className="carta-adjuntos">
        <li>Boleta de inscripción.</li>
        <li>Boleta de pago por concepto de adición de materias (Bs. 10).</li>
      </ul>

      <p className="carta-parrafo">
        Sin otro particular y a la espera que esta información le sea de beneficio, me despido y le extiendo un
        cordial saludo.
      </p>

      <p>Atentamente:</p>

      <p className="carta-firma">_________________________</p>
      <p className="carta-firma-label">Firma</p>

      <p className="carta-datos-final">
        <strong>Nombre y apellido:</strong> {nombreCompleto || '_________________________'}
        <br />
        <strong>Registro:</strong> {datosPersonales.registro || '_________________________'}
        <br />
        <strong>Celular:</strong> {datosPersonales.celular || '_________________________'}
      </p>
    </article>
  )
}

function CartaOcho({ datosPersonales, nombreCompleto, fecha }) {
  return (
    <article className="carta carta-ocho">
      <div className="carta-letterhead">
        <img src="/logo.png" alt="" className="carta-logo" />
        <p className="carta-fecha">
          Santa Cruz de la Sierra, {fecha.dia} de {fecha.mes} de {fecha.anio}
        </p>
      </div>

      <p className="carta-destinatario">
        A: {datosPersonales.director || DIRECTORA}
        <br />
        <strong>DIRECTORA DE LA CARRERA DE MEDICINA</strong>
        <br />
        <strong>VETERINARIA Y ZOOTECNIA.</strong>
        <br />
        <strong>{FACULTAD}</strong>
      </p>

      <p className="carta-ref">
        <strong>Ref.:</strong> Solicitud de autorización para cursar ocho (8) materias en el semestre{' '}
        {datosPersonales.semestre || '_'}/{datosPersonales.anio || '202_'}
      </p>

      <p>De mi mayor consideración:</p>

      <p className="carta-parrafo">
        Yo, <strong>{nombreCompleto || '___________________'}</strong> con Registro{' '}
        <strong>{datosPersonales.registro || '_______________'}</strong> Universitario, estudiante de la Carrera de{' '}
        {CARRERA}, me dirijo a su autoridad con el debido respeto para solicitar la autorización correspondiente
        para poder inscribir y cursar un total de ocho (8) materias durante el semestre{' '}
        {datosPersonales.semestre || '_'}/{datosPersonales.anio || '202_'}.
      </p>

      <p className="carta-parrafo">
        La presente solicitud tiene como finalidad avanzar en mi formación académica y optimizar mi rendimiento
        durante el presente periodo, asumiendo el compromiso de cumplir responsablemente con la carga académica y
        con todas las obligaciones que demandan las asignaturas.
      </p>

      <p className="carta-parrafo">
        Por lo expuesto, solicito muy respetuosamente que mi petición sea considerada y, de ser procedente, se
        autorice cursar las ocho (8) materias durante el presente semestre.
      </p>

      <p className="carta-parrafo">Adjunto a la presente la siguiente documentación de respaldo:</p>
      <ul className="carta-adjuntos">
        <li>Boleta de inscripción.</li>
        <li>Avance académico.</li>
        <li>Histórico académico.</li>
      </ul>

      <p className="carta-parrafo">
        Sin otro particular y esperando una respuesta favorable a mi solicitud, me despido de su autoridad
        reiterándole las seguridades de mi más alta consideración y respeto.
      </p>

      <p>Atentamente,</p>

      <p className="carta-datos-final">
        <strong>Nombre Completo:</strong> {nombreCompleto || '_________________________'}
        <br />
        <strong>Registro Universitario:</strong> {datosPersonales.registro || '_________________________'}
        <br />
        <strong>Número de celular:</strong> {datosPersonales.celular || '_________________________'}
      </p>
    </article>
  )
}
