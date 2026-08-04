import { useLayoutEffect, useMemo, useRef, useState } from 'react'

const GUTTER_EDGE_MARGIN = 26 // distancia desde el borde de la hoja al carril externo (fallback)
const DEFAULT_COLOR = '#1a1a1a'
const FAN_OFFSET_STEP = 10 // separación entre líneas que comparten el mismo origen o destino
const AVOID_LANE_STEP = 7 // separación de altura entre líneas "avoid" que comparten origen

function markerId(color) {
  return `arrowhead-${color.replace('#', '')}`
}

// Dibuja flechas entre materias usando refs de DOM reales — se recalculan en cada
// render (posiciones cambian cuando una card gana/pierde su badge de estado) y ante
// resize del viewport o del contenedor (ResizeObserver).
//
// Cada edge conecta el borde del card "from" más cercano a "to" (arriba o abajo,
// según cuál quede más alto en pantalla). Cuando varias líneas comparten el mismo
// origen o destino, se reparten en abanico (en vez de salir/entrar todas por el
// mismo punto) ordenadas según la posición real del otro extremo.
//
// Los edges con `avoid.through: [codeA, codeB]` no van en línea recta: se enrutan
// por el hueco vacío entre esas dos materias puntuales (nunca sobre una card), usando
// la posición real medida de ambas. Los que traen `avoid.offset` usan un carril
// externo a la derecha de la hoja como respaldo cuando no hay un hueco interior útil.
//
// `bus` (opcional) agrupa un conjunto de prerrequisitos muchos-a-muchos (ej. las 5
// materias de un semestre que abren 3 modalidades) en un solo "bus": las líneas de
// origen se juntan en una barra horizontal y de ahí salen las líneas hacia cada
// destino, en vez de dibujar todas las combinaciones por separado.
export default function PrereqArrows({ containerRef, cardRefs, edges, bus }) {
  const svgRef = useRef(null)
  const shapeRefs = useRef({})
  const busStemRefs = useRef({})
  const busTrunkRef = useRef(null)
  const busBranchRefs = useRef({})
  const [, forceRecalc] = useState(0)

  const colors = useMemo(() => {
    const set = new Set([DEFAULT_COLOR])
    for (const { avoid } of edges) if (avoid?.color) set.add(avoid.color)
    return [...set]
  }, [edges])

  useLayoutEffect(() => {
    const container = containerRef.current
    const svg = svgRef.current
    if (!container || !svg) return

    const containerRect = container.getBoundingClientRect()
    svg.setAttribute('width', container.scrollWidth)
    svg.setAttribute('height', container.scrollHeight)

    // Paso 1: geometría base de cada edge (sin abanico todavía)
    const geo = edges
      .map((edge) => {
        const fromEl = cardRefs.current[edge.from]
        const toEl = cardRefs.current[edge.to]
        if (!fromEl || !toEl) return null
        const fr = fromEl.getBoundingClientRect()
        const tr = toEl.getBoundingClientRect()
        const fromCenterY = fr.top - containerRect.top + fr.height / 2
        const toCenterY = tr.top - containerRect.top + tr.height / 2
        const fromIsAbove = fromCenterY <= toCenterY
        return {
          edge,
          fromIsAbove,
          x1: fr.left - containerRect.left + fr.width / 2,
          y1: fromIsAbove ? fr.bottom - containerRect.top : fr.top - containerRect.top,
          x2: tr.left - containerRect.left + tr.width / 2,
          y2: fromIsAbove ? tr.top - containerRect.top : tr.bottom - containerRect.top,
          fromOffset: 0,
          toOffset: 0,
        }
      })
      .filter(Boolean)

    // Paso 2: repartir en abanico las líneas que comparten origen o destino
    const fromGroups = new Map()
    const toGroups = new Map()
    for (const g of geo) {
      if (!fromGroups.has(g.edge.from)) fromGroups.set(g.edge.from, [])
      fromGroups.get(g.edge.from).push(g)
      if (!toGroups.has(g.edge.to)) toGroups.set(g.edge.to, [])
      toGroups.get(g.edge.to).push(g)
    }
    for (const group of fromGroups.values()) {
      if (group.length < 2) continue
      group.sort((a, b) => a.x2 - b.x2)
      group.forEach((g, i) => {
        g.fromOffset = (i - (group.length - 1) / 2) * FAN_OFFSET_STEP
      })
    }
    for (const group of toGroups.values()) {
      if (group.length < 2) continue
      group.sort((a, b) => a.x1 - b.x1)
      group.forEach((g, i) => {
        g.toOffset = (i - (group.length - 1) / 2) * FAN_OFFSET_STEP
      })
    }

    // Paso 2b: cuando varias líneas "avoid" salen del mismo origen, su primer tramo
    // horizontal (a la altura midY1) cae exactamente en el mismo Y para todas — ahí
    // donde sus rangos de X se superponen quedan una encima de la otra, pixel a pixel,
    // y no se distingue el color de abajo. Se escalona esa altura por línea (una banda
    // por edge, en el mismo orden que su destino) para que viajen en paralelo separadas.
    const avoidGroups = new Map()
    for (const g of geo) {
      if (!g.edge.avoid) continue
      if (!avoidGroups.has(g.edge.from)) avoidGroups.set(g.edge.from, [])
      avoidGroups.get(g.edge.from).push(g)
    }
    for (const group of avoidGroups.values()) {
      if (group.length < 2) continue
      group.sort((a, b) => a.x2 - b.x2)
      group.forEach((g, i) => {
        g.avoidLane = i
      })
    }

    // Paso 3: dibujar cada línea con su punto de salida/entrada ya separado
    for (const g of geo) {
      const { edge, fromIsAbove, y1, y2 } = g
      const { from, to, avoid, straight } = edge
      const shapeEl = shapeRefs.current[`${from}-${to}`]
      if (!shapeEl) continue

      // `straight` fuerza esta línea puntual a ir de centro a centro, ignorando el
      // abanico automático — para casos donde el origen y el destino ya están
      // alineados en columna y no hace falta (ni conviene) separarla de las demás.
      const x1 = straight ? g.x1 : g.x1 + g.fromOffset + (avoid?.startOffset ?? 0)
      const x2 = straight ? g.x2 : g.x2 + g.toOffset + (avoid?.endOffset ?? 0)

      shapeEl.style.stroke = avoid?.color || DEFAULT_COLOR
      shapeEl.setAttribute('marker-end', `url(#${markerId(avoid?.color || DEFAULT_COLOR)})`)

      if (!avoid) {
        shapeEl.setAttribute('points', `${x1},${y1} ${x2},${y2}`)
        continue
      }

      const lane = g.avoidLane ?? 0
      const laneGap = 12 + lane * AVOID_LANE_STEP + (avoid.laneOffset ?? 0)
      const midY1 = fromIsAbove ? y1 + laneGap : y1 - laneGap
      const endLaneGap = 12 + (avoid.endLaneOffset ?? 0)
      const midY2 = fromIsAbove ? y2 - endLaneGap : y2 + endLaneGap

      let gapX = null
      if (avoid.through) {
        const [codeA, codeB] = avoid.through
        const elA = cardRefs.current[codeA]
        const elB = cardRefs.current[codeB]
        if (elA && elB) {
          const ra = elA.getBoundingClientRect()
          const rb = elB.getBoundingClientRect()
          const leftRect = ra.left <= rb.left ? ra : rb
          const rightRect = ra.left <= rb.left ? rb : ra
          gapX = (leftRect.right + rightRect.left) / 2 - containerRect.left
        }
      }
      if (gapX === null) {
        gapX = container.scrollWidth - GUTTER_EDGE_MARGIN - (avoid.offset ?? 0)
      }
      gapX += avoid.gapOffset ?? 0

      shapeEl.setAttribute(
        'points',
        `${x1},${y1} ${x1},${midY1} ${gapX},${midY1} ${gapX},${midY2} ${x2},${midY2} ${x2},${y2}`
      )
    }

    if (bus) {
      const srcEls = bus.sources.map((c) => cardRefs.current[c]).filter(Boolean)
      const tgtEls = bus.targets.map((c) => cardRefs.current[c]).filter(Boolean)
      if (srcEls.length && tgtEls.length) {
        const srcRect0 = srcEls[0].getBoundingClientRect()
        const tgtRect0 = tgtEls[0].getBoundingClientRect()
        const srcCenterY = srcRect0.top - containerRect.top + srcRect0.height / 2
        const tgtCenterY = tgtRect0.top - containerRect.top + tgtRect0.height / 2
        const sourcesAbove = srcCenterY <= tgtCenterY

        const srcEdgeY = sourcesAbove
          ? srcRect0.bottom - containerRect.top
          : srcRect0.top - containerRect.top
        const tgtEdgeY = sourcesAbove
          ? tgtRect0.top - containerRect.top
          : tgtRect0.bottom - containerRect.top
        const trunkY = (srcEdgeY + tgtEdgeY) / 2

        const srcXs = []
        for (const code of bus.sources) {
          const el = cardRefs.current[code]
          const stemEl = busStemRefs.current[code]
          if (!el || !stemEl) continue
          const r = el.getBoundingClientRect()
          const x = r.left - containerRect.left + r.width / 2
          srcXs.push(x)
          stemEl.setAttribute('points', `${x},${srcEdgeY} ${x},${trunkY}`)
        }

        const tgtXs = []
        for (const code of bus.targets) {
          const el = cardRefs.current[code]
          const branchEl = busBranchRefs.current[code]
          if (!el || !branchEl) continue
          const r = el.getBoundingClientRect()
          const x = r.left - containerRect.left + r.width / 2
          tgtXs.push(x)
          branchEl.setAttribute('points', `${x},${trunkY} ${x},${tgtEdgeY}`)
        }

        const allXs = [...srcXs, ...tgtXs]
        if (busTrunkRef.current && allXs.length) {
          const minX = Math.min(...allXs)
          const maxX = Math.max(...allXs)
          busTrunkRef.current.setAttribute('points', `${minX},${trunkY} ${maxX},${trunkY}`)
        }
      }
    }
  })

  useLayoutEffect(() => {
    const container = containerRef.current
    function onResize() {
      forceRecalc((t) => t + 1)
    }
    window.addEventListener('resize', onResize)
    const ro = new ResizeObserver(onResize)
    if (container) ro.observe(container)
    return () => {
      window.removeEventListener('resize', onResize)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // En la build de producción (fuera de StrictMode, que en dev duplica el primer
  // render y de paso "corrige gratis" cualquier medición tomada antes de que el
  // layout termine de asentarse) el cálculo inicial puede correr un frame antes de
  // que el navegador estabilice el layout definitivo. Se fuerza una segunda pasada
  // después del primer pintado — igual que ya corrige un resize manual — para no
  // depender de esa casualidad de StrictMode.
  useLayoutEffect(() => {
    const raf = requestAnimationFrame(() => forceRecalc((t) => t + 1))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <svg ref={svgRef} className="prereq-arrows">
      <defs>
        {colors.map((color) => (
          <marker
            key={color}
            id={markerId(color)}
            markerWidth="8"
            markerHeight="10"
            refX="6"
            refY="5"
            orient="auto"
          >
            <path d="M0,0 L8,5 L0,10 Z" fill={color} />
          </marker>
        ))}
      </defs>
      {edges.map(({ from, to }) => (
        <polyline
          key={`${from}-${to}`}
          ref={(el) => {
            shapeRefs.current[`${from}-${to}`] = el
          }}
          points=""
          className="prereq-arrow-line"
        />
      ))}
      {bus && (
        <>
          {bus.sources.map((code) => (
            <polyline
              key={`bus-src-${code}`}
              ref={(el) => {
                busStemRefs.current[code] = el
              }}
              points=""
              className="prereq-arrow-line"
            />
          ))}
          <polyline ref={busTrunkRef} points="" className="prereq-arrow-line" />
          {bus.targets.map((code) => (
            <polyline
              key={`bus-tgt-${code}`}
              ref={(el) => {
                busBranchRefs.current[code] = el
              }}
              points=""
              className="prereq-arrow-line"
              markerEnd={`url(#${markerId(DEFAULT_COLOR)})`}
            />
          ))}
        </>
      )}
    </svg>
  )
}
