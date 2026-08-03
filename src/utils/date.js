const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export function formatFechaLarga(date = new Date()) {
  const dia = date.getDate()
  const mes = MESES[date.getMonth()]
  const anio = date.getFullYear()
  return { dia, mes, anio, texto: `${dia} de ${mes} de ${anio}` }
}
