// Malla curricular — Medicina Veterinaria y Zootecnia (Plan 139-3)
// prereq: array of subject codes required to be APROBADA before this one
// can be requested as "caso especial". Empty array = sin prerrequisito.

export const CARRERA = 'Medicina Veterinaria y Zootecnia'
export const PLAN = '139-3'
export const DIRECTORA = 'Dra. Moira Evelyn Martínez Peredo'
export const FACULTAD = 'F.C.V. – U.A.G.R.M.'

export const SEMESTRES = [
  {
    numero: 1,
    label: 'Primer semestre',
    materias: [
      { code: 'SAP100', name: 'Ecología General', prereq: [] },
      { code: 'VET100', name: 'Histología y Embriología Vet.', prereq: [] },
      { code: 'VET101', name: 'Anatomía Veterinaria 1', prereq: [] },
      { code: 'VET102', name: 'Metodología de la Investigación', prereq: [] },
      { code: 'ZOT100', name: 'Bioquímica Veterinaria 1', prereq: [] },
    ],
  },
  {
    numero: 2,
    label: 'Segundo semestre',
    materias: [
      { code: 'ZOT103', name: 'Etología y Bienestar animal', prereq: ['SAP100'] },
      { code: 'VET103', name: 'Histología Veterinaria 2', prereq: ['VET100'] },
      { code: 'VET104', name: 'Anatomía Veterinaria 2', prereq: ['VET101'] },
      { code: 'ZOT102', name: 'Bioestadística Veterinaria', prereq: ['VET102'] },
      { code: 'ZOT101', name: 'Bioquímica Veterinaria 2', prereq: ['ZOT100'] },
    ],
  },
  {
    numero: 3,
    label: 'Tercer semestre',
    materias: [
      { code: 'SAP103', name: 'Parasitología y enfermedades parasitarias 1', prereq: ['ZOT103'] },
      { code: 'SAP101', name: 'Bacteriología y Micología Vet.', prereq: ['VET103'] },
      { code: 'VET105', name: 'Fisiología Animal 1', prereq: ['VET104'] },
      { code: 'ZOT104', name: 'Genética Veterinaria', prereq: ['ZOT102'] },
      { code: 'SAP102', name: 'Virología e Inmunología Vet.', prereq: ['ZOT101'] },
    ],
  },
  {
    numero: 4,
    label: 'Cuarto semestre',
    materias: [
      { code: 'SAP104', name: 'Parasitología y enfermedades parasitarias 2', prereq: ['SAP103'] },
      { code: 'VET107', name: 'Patología General', prereq: ['SAP101'] },
      { code: 'VET106', name: 'Fisiología Animal 2', prereq: ['VET105'] },
      { code: 'ZOT105', name: 'Nutrición Aplicada', prereq: ['ZOT104'] },
      { code: 'VET108', name: 'Propedéutica', prereq: ['SAP102'] },
    ],
  },
  {
    numero: 5,
    label: 'Quinto semestre',
    materias: [
      { code: 'ZOT107', name: 'Producción y Manejo de Forrajes', prereq: ['SAP104'] },
      { code: 'VET110', name: 'Patología Sistémica', prereq: ['VET107'] },
      { code: 'VET109', name: 'Fisiopatología de la Reproducción Animal', prereq: ['VET106'] },
      { code: 'ZOT106', name: 'Alimentos y Alimentación', prereq: ['ZOT105'] },
      { code: 'VET111', name: 'Farmacología y Terapéutica Vet.', prereq: ['VET108'] },
    ],
  },
  {
    numero: 6,
    label: 'Sexto semestre',
    materias: [
      { code: 'VET113', name: 'Imagenología', prereq: ['VET108'] },
      { code: 'VET114', name: 'Toxicología', prereq: ['VET110'] },
      { code: 'VET112', name: 'Enfermedades infecciosas de los animales', prereq: ['VET109'] },
      { code: 'ZOT108', name: 'Economía Agropecuaria', prereq: ['ZOT106'] },
      { code: 'VET115', name: 'Terapéutica Quirúrgica y Cirugía Vet.', prereq: ['VET111'] },
    ],
  },
  {
    numero: 7,
    label: 'Séptimo semestre',
    materias: [
      { code: 'ZOT110', name: 'Acuicultura', prereq: ['ZOT108'] },
      { code: 'SAP105', name: 'Tecnología, Higiene e Inspección de Alimentos', prereq: ['VET114'] },
      { code: 'SAP106', name: 'Epidemiología Veterinaria', prereq: ['VET112'] },
      { code: 'ZOT109', name: 'Producción de Ovinos, Caprinos y camélidos', prereq: ['ZOT108'] },
      { code: 'VET116', name: 'Patología Clínica', prereq: ['VET115'] },
    ],
  },
  {
    numero: 8,
    label: 'Octavo semestre',
    materias: [
      { code: 'ZOT115', name: 'Producción de Equinos', prereq: ['ZOT108'] },
      { code: 'ZOT113', name: 'Producción de Bovinos de Leche', prereq: ['ZOT108', 'SAP105'] },
      { code: 'ZOT112', name: 'Producción de Bovinos de Carne', prereq: ['SAP106', 'ZOT108'] },
      { code: 'ZOT114', name: 'Producción de Aves', prereq: ['SAP106', 'ZOT108'] },
      { code: 'ZOT111', name: 'Producción de Cerdos', prereq: ['VET116', 'ZOT108'] },
    ],
  },
  {
    numero: 9,
    label: 'Noveno semestre',
    materias: [
      { code: 'SAP108', name: 'Deontología y Legislación vet.', prereq: ['SAP106'] },
      { code: 'SAP107', name: 'Salud Pública Vet.', prereq: ['ZOT113'] },
      { code: 'VET117', name: 'Clínica para todas las especies', prereq: ['ZOT112'] },
      { code: 'ZOT116', name: 'Administración Agropecuaria', prereq: ['ZOT114'] },
      { code: 'ZOT117', name: 'Interacción y Sociología Rural', prereq: ['ZOT111'] },
    ],
  },
]

// Modalidad de graduación — prácticas pre-profesionales dirigidas (tras el 9° semestre)
// Requieren haber aprobado las 5 materias del 9° semestre completo, no solo una.
const NOVENO_COMPLETO = ['SAP108', 'SAP107', 'VET117', 'ZOT116', 'ZOT117']
// Y además haber terminado al menos una de las dos líneas electivas completas
// (no hace falta las dos — con Clínica o con Producción alcanza).
const ELECTIVA_LINEA_FINAL = ['VET122', 'ZOT222']

export const MODALIDAD_GRADUACION = {
  label: 'Modalidad de Graduación',
  materias: [
    {
      code: 'SAP109',
      name: 'Pract. Pre Prof. Dirigidas en salud pub. e inocuidad',
      prereq: NOVENO_COMPLETO,
      prereqAnyOf: ELECTIVA_LINEA_FINAL,
    },
    {
      code: 'VET123',
      name: 'Pract. Pre Prof. Dirigidas en Clínica y Cirugía',
      prereq: NOVENO_COMPLETO,
      prereqAnyOf: ELECTIVA_LINEA_FINAL,
    },
    {
      code: 'ZOT223',
      name: 'Pract. Pre Prof. Dirigidas en adm. y producción',
      prereq: NOVENO_COMPLETO,
      prereqAnyOf: ELECTIVA_LINEA_FINAL,
    },
  ],
}

// Electivas (5° a 9° semestre) — dos líneas independientes
export const ELECTIVAS = {
  label: 'Electivas (5° a 9° semestre)',
  lineas: [
    {
      nombre: 'Clínica',
      materias: [
        { code: 'VET118', name: 'Urgencias médico veterinarias', prereq: ['VET108'] },
        { code: 'VET119', name: 'Metodología Diagnóstica y bromatología', prereq: ['VET118'] },
        { code: 'VET120', name: 'Clínica y cirugía especial', prereq: ['VET119'] },
        { code: 'VET121', name: 'Enfermedades emergentes', prereq: ['VET120'] },
        { code: 'VET122', name: 'Administración de programas sanitarios', prereq: ['VET121'] },
      ],
    },
    {
      nombre: 'Producción',
      materias: [
        { code: 'ZOT218', name: 'Mejoramiento Genético', prereq: ['ZOT104'] },
        { code: 'ZOT219', name: 'Desarrollo sostenible e higiene ambiental', prereq: ['ZOT218'] },
        { code: 'ZOT220', name: 'Biotecnología de la reproducción', prereq: ['ZOT219'] },
        { code: 'ZOT221', name: 'Producción orgánica pecuaria', prereq: ['ZOT220'] },
        { code: 'ZOT222', name: 'Gerencia, planificación y gestión de procesos', prereq: ['ZOT221'] },
      ],
    },
  ],
}

// Índice plano code -> materia (incluye grupo/semestre de origen) para lookups rápidos
export function buildMateriaIndex() {
  const index = {}
  for (const sem of SEMESTRES) {
    for (const m of sem.materias) {
      index[m.code] = { ...m, semestre: sem.numero, grupo: 'regular' }
    }
  }
  for (const m of MODALIDAD_GRADUACION.materias) {
    index[m.code] = { ...m, semestre: null, grupo: 'graduacion' }
  }
  for (const linea of ELECTIVAS.lineas) {
    for (const m of linea.materias) {
      index[m.code] = { ...m, semestre: null, grupo: 'electiva', linea: linea.nombre }
    }
  }
  return index
}

export const MATERIA_INDEX = buildMateriaIndex()

// Departamentos de Bolivia — abreviaturas usadas en el carnet de identidad (placeholder,
// reemplazar cuando se confirmen las abreviaturas exactas que pidió el usuario)
export const PROCEDENCIAS = [
  { code: 'SC', label: 'Santa Cruz' },
  { code: 'LP', label: 'La Paz' },
  { code: 'CB', label: 'Cochabamba' },
  { code: 'OR', label: 'Oruro' },
  { code: 'PT', label: 'Potosí' },
  { code: 'CH', label: 'Chuquisaca' },
  { code: 'TJ', label: 'Tarija' },
  { code: 'BE', label: 'Beni' },
  { code: 'PA', label: 'Pando' },
]
