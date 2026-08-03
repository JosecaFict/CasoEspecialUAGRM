const ESTADO_CLASS = {
  aprobada: 'estado-verde',
  inscrita: 'estado-amarillo',
  especial: 'estado-rojo',
}

export default function MateriaCard({ materia, estado, disabled, disabledReason, onClick, variant, cardRef }) {
  const estadoClass = estado ? ESTADO_CLASS[estado] : ''
  const variantClass = variant ? `variant-${variant}` : ''

  return (
    <button
      ref={cardRef}
      type="button"
      className={`materia-card ${variantClass} ${estadoClass} ${disabled ? 'materia-card-disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledReason : ''}
    >
      <span className="materia-code">{materia.code}</span>
      <span className="materia-name">{materia.name}</span>
    </button>
  )
}
