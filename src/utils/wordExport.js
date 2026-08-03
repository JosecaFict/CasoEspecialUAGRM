import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  AlignmentType,
  WidthType,
  BorderStyle,
  VerticalAlign,
  convertInchesToTwip,
  convertMillimetersToTwip,
} from 'docx'

const PAGE_WIDTH_MM = 216
const PAGE_HEIGHT_MM = 330
const MARGIN_IN = 1
// Ancho disponible dentro de los márgenes, en píxeles (96dpi) — para escalar las
// imágenes de la malla al ancho completo de la página.
const CONTENT_WIDTH_PX = Math.round(((PAGE_WIDTH_MM - MARGIN_IN * 25.4 * 2) / 25.4) * 96)
import { DIRECTORA, FACULTAD, CARRERA } from '../data/malla'

const DOUBLE_SPACING = { line: 480 } // 240 = simple, 480 = doble
const INDENT_FIRST_LINE = { firstLine: convertInchesToTwip(0.5) }
const NO_BORDER = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
}

function run(text, opts = {}) {
  return new TextRun({ text, font: 'Times New Roman', size: 24, ...opts })
}

function paragraph(children, opts = {}) {
  return new Paragraph({ children, spacing: DOUBLE_SPACING, ...opts })
}

async function fetchImageBuffer(path) {
  const res = await fetch(path)
  return res.arrayBuffer()
}

function buildLetterhead(logoBuffer, fechaTexto) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDER,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            borders: NO_BORDER,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [
                  new ImageRun({
                    type: 'png',
                    data: logoBuffer,
                    // El logo real es 106x164 (vertical) — se respeta esa proporción
                    // para que no se vea estirado al agrandarlo.
                    transformation: { width: 45, height: 70 },
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 80, type: WidthType.PERCENTAGE },
            borders: NO_BORDER,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [run(fechaTexto)],
              }),
            ],
          }),
        ],
      }),
    ],
  })
}

function buildDestinatario(directorTexto) {
  return paragraph(
    [
      run(`A: ${directorTexto}`),
      new TextRun({
        text: 'DIRECTORA DE LA CARRERA DE MEDICINA',
        break: 1,
        font: 'Times New Roman',
        size: 24,
        bold: true,
      }),
      new TextRun({ text: 'VETERINARIA Y ZOOTECNIA.', break: 1, font: 'Times New Roman', size: 24, bold: true }),
      new TextRun({ text: FACULTAD, break: 1, font: 'Times New Roman', size: 24, bold: true }),
    ],
    { spacing: { after: 200, line: 480 } }
  )
}

function buildRef(texto) {
  return paragraph([run('Ref.: ', { bold: true }), run(texto)], {
    alignment: AlignmentType.CENTER,
    spacing: { before: 480, line: 480 },
  })
}

function buildBodyParagraph(children) {
  return paragraph(children, { indent: INDENT_FIRST_LINE })
}

function tableCellText(text, opts = {}) {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({ children: [run(text, opts)], alignment: AlignmentType.CENTER })],
  })
}

function buildMateriasTable(especiales, materiaGrupos, requiereFirmaDocente) {
  const headerCells = ['SIGLA', 'MATERIA', 'GRUPO']
  if (requiereFirmaDocente) headerCells.push('FIRMA DOCENTE')

  const headerRow = new TableRow({
    tableHeader: true,
    children: headerCells.map((h) => tableCellText(h, { bold: true })),
  })

  const rows = especiales.map((m) => {
    const cells = [
      tableCellText(m.code),
      tableCellText(m.name),
      tableCellText(materiaGrupos[m.code] || ''),
    ]
    if (requiereFirmaDocente) cells.push(tableCellText(''))
    return new TableRow({ children: cells })
  })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...rows],
  })
}

// `lines` es un array de { label, value } — la etiqueta va en negrilla, el valor no.
function buildFirmaBlock(lines) {
  return [
    paragraph([run('_________________________')], { alignment: AlignmentType.CENTER, spacing: { before: 480 } }),
    paragraph([run('Firma')], { alignment: AlignmentType.CENTER }),
    paragraph(
      lines.flatMap(({ label, value }, i) => [
        new TextRun({ text: label, break: i === 0 ? 0 : 1, font: 'Times New Roman', size: 24, bold: true }),
        new TextRun({ text: value, font: 'Times New Roman', size: 24 }),
      ]),
      { alignment: AlignmentType.CENTER, spacing: { before: 240 } }
    ),
  ]
}

function buildCartaNormalSection(logoBuffer, { datosPersonales, especiales, materiaGrupos, nombreCompleto, fecha }) {
  const requiereFirmaDocente = datosPersonales.etapa === '2'
  const fechaTexto = `Santa Cruz ${fecha.dia} de ${fecha.mes} de ${fecha.anio}`

  return [
    buildLetterhead(logoBuffer, fechaTexto),
    new Paragraph({ text: '', spacing: DOUBLE_SPACING }),
    buildDestinatario(datosPersonales.director || DIRECTORA),
    buildRef('Solicitud de Adición de Materias como caso Especial.'),
    buildBodyParagraph([
      run(
        'Mediante la presente, me dirijo a su autoridad a objeto de solicitar que su persona instruya a la sección ' +
          'correspondiente, la inscripción de materias como caso especial que corresponde al semestre '
      ),
      run(`${datosPersonales.semestre || '___'}/${datosPersonales.anio || '202__'}.`, { bold: true }),
    ]),
    new Paragraph({ text: '', spacing: DOUBLE_SPACING }),
    buildMateriasTable(especiales, materiaGrupos, requiereFirmaDocente),
    new Paragraph({ text: '', spacing: DOUBLE_SPACING }),
    paragraph([run('•  Adjunto boleta de inscripción, y,')]),
    paragraph([run('•  Boleta de pago de adicción (caja) 10 Bs.')]),
    buildBodyParagraph([
      run(
        'Sin otro particular y a la espera que esta información le sea de beneficio, me despido y le extiendo un ' +
          'cordial saludo.'
      ),
    ]),
    paragraph([run('Atentamente:')]),
    ...buildFirmaBlock([
      { label: 'Nombre y apellido: ', value: nombreCompleto || '_________________________' },
      { label: 'Registro: ', value: datosPersonales.registro || '_________________________' },
      { label: 'Celular: ', value: datosPersonales.celular || '_________________________' },
    ]),
  ]
}

function buildCartaOchoSection(logoBuffer, { datosPersonales, nombreCompleto, fecha }) {
  const fechaTexto = `Santa Cruz de la Sierra, ${fecha.dia} de ${fecha.mes} de ${fecha.anio}`
  const semAnio = `${datosPersonales.semestre || '_'}/${datosPersonales.anio || '202_'}`

  return [
    new Paragraph({ children: [new TextRun({ text: '', break: 1 })], pageBreakBefore: true }),
    buildLetterhead(logoBuffer, fechaTexto),
    new Paragraph({ text: '', spacing: DOUBLE_SPACING }),
    buildDestinatario(datosPersonales.director || DIRECTORA),
    buildRef(`Solicitud de autorización para cursar ocho (8) materias en el semestre ${semAnio}`),
    paragraph([run('De mi mayor consideración:')]),
    buildBodyParagraph([
      run('Yo, '),
      run(nombreCompleto || '___________________', { bold: true }),
      run(' con Registro '),
      run(datosPersonales.registro || '_______________', { bold: true }),
      run(
        ' Universitario, estudiante de la Carrera de ' +
          CARRERA +
          ', me dirijo a su autoridad con el debido respeto para solicitar la autorización correspondiente para ' +
          'poder inscribir y cursar un total de ocho (8) materias durante el semestre '
      ),
      run(`${semAnio}.`),
    ]),
    buildBodyParagraph([
      run(
        'La presente solicitud obedece a mi interés de avanzar en mi formación académica y optimizar mi ' +
          'rendimiento durante el presente periodo, comprometiéndome a asumir con responsabilidad la carga ' +
          'académica y cumplir con todas las obligaciones que demandan las asignaturas.'
      ),
    ]),
    buildBodyParagraph([
      run(
        'Por lo expuesto, solicito muy respetuosamente que mi petición sea considerada y, de ser posible, se ' +
          'autorice la inscripción de las ocho materias para el presente semestre.'
      ),
    ]),
    buildBodyParagraph([
      run(
        'Sin otro particular, agradezco de antemano la atención brindada a la presente y quedo a la espera de una ' +
          'respuesta favorable.'
      ),
    ]),
    paragraph([run('Atentamente,')]),
    paragraph(
      [
        new TextRun({ text: 'Nombre Completo: ', font: 'Times New Roman', size: 24, bold: true }),
        new TextRun({
          text: nombreCompleto || '_________________________',
          font: 'Times New Roman',
          size: 24,
        }),
        new TextRun({
          text: 'Registro Universitario: ',
          break: 1,
          font: 'Times New Roman',
          size: 24,
          bold: true,
        }),
        new TextRun({
          text: datosPersonales.registro || '_________________________',
          font: 'Times New Roman',
          size: 24,
        }),
        new TextRun({
          text: 'Número de celular: ',
          break: 1,
          font: 'Times New Roman',
          size: 24,
          bold: true,
        }),
        new TextRun({
          text: datosPersonales.celular || '_________________________',
          font: 'Times New Roman',
          size: 24,
        }),
        new TextRun({
          text: 'Adjunto boleta de inscripción, avance académico e histórico:',
          break: 1,
          font: 'Times New Roman',
          size: 24,
        }),
      ],
      { alignment: AlignmentType.CENTER, spacing: { before: 480, line: 480 } }
    ),
  ]
}

function buildMallaImagePage(img) {
  const width = CONTENT_WIDTH_PX
  const height = Math.round(img.height * (width / img.width))
  return new Paragraph({
    pageBreakBefore: true,
    alignment: AlignmentType.CENTER,
    children: [new ImageRun({ type: 'png', data: img.buffer, transformation: { width, height } })],
  })
}

export async function downloadCartasWord({
  datosPersonales,
  especiales,
  materiaGrupos,
  nombreCompleto,
  fecha,
  necesitaCartaOcho,
  mallaImages = [],
}) {
  const logoBuffer = await fetchImageBuffer('/logo.png')

  const children = buildCartaNormalSection(logoBuffer, {
    datosPersonales,
    especiales,
    materiaGrupos,
    nombreCompleto,
    fecha,
  })

  if (necesitaCartaOcho) {
    children.push(...buildCartaOchoSection(logoBuffer, { datosPersonales, nombreCompleto, fecha }))
  }

  for (const img of mallaImages) {
    children.push(buildMallaImagePage(img))
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertMillimetersToTwip(PAGE_WIDTH_MM),
              height: convertMillimetersToTwip(PAGE_HEIGHT_MM),
            },
            margin: {
              top: convertInchesToTwip(MARGIN_IN),
              right: convertInchesToTwip(MARGIN_IN),
              bottom: convertInchesToTwip(MARGIN_IN),
              left: convertInchesToTwip(MARGIN_IN),
            },
          },
        },
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'Carta de Solicitud - Caso Especial.docx'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
