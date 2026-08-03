// Filtros de entrada: eliminan caracteres no permitidos a medida que el usuario escribe.

export function onlyLetters(value) {
  return value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, '')
}

export function onlyDigits(value, maxLength) {
  const digits = value.replace(/\D/g, '')
  return maxLength ? digits.slice(0, maxLength) : digits
}

// PPA: número de 0 a 100, admite hasta 2 decimales (ej. 78.56)
export function sanitizePPA(value) {
  let v = value.replace(/[^0-9.]/g, '')
  const parts = v.split('.')
  if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('')
  const [intPart, decPart] = v.split('.')
  let clean = intPart.slice(0, 3)
  if (decPart !== undefined) clean += '.' + decPart.slice(0, 2)
  return clean
}

export function ppaInRange(value) {
  if (value === '' || value === undefined || value === null) return true // opcional
  const n = Number(value)
  return !Number.isNaN(n) && n >= 0 && n <= 100
}

export function digitsInRange(value, min, max) {
  return value.length >= min && value.length <= max
}
