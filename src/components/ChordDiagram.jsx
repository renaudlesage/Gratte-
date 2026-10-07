// Diagramme d'accord en SVG : cordes verticales (corde 6 à gauche), frettes horizontales
export default function ChordDiagram({ chord, size = 140, showName = true, highlight = false }) {
  if (!chord) return null
  const { frets, fingers, barre } = chord
  const played = frets.filter((f) => f > 0)
  const maxFret = played.length ? Math.max(...played) : 0
  const base = maxFret > 4 ? Math.min(...played) : 1
  const nFrets = 5

  const W = 120
  const H = 150
  const left = 18
  const right = W - 14
  const top = 34
  const bottom = H - 10
  const sx = (right - left) / 5
  const fy = (bottom - top) / nFrets
  const xs = (s) => left + s * sx
  const yMid = (f) => top + (f - base + 0.5) * fy

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={size}
      height={(size * H) / W}
      className={`chord-diagram${highlight ? ' is-highlight' : ''}`}
      role="img"
      aria-label={`Diagramme de l'accord ${chord.id}`}
    >
      {showName && (
        <text x={W / 2} y={12} textAnchor="middle" className="cd-name">
          {chord.id}
        </text>
      )}
      {/* sillet ou numéro de case */}
      {base === 1 ? (
        <rect x={left - 1} y={top - 4} width={right - left + 2} height={4} className="cd-nut" />
      ) : (
        <text x={left - 6} y={top + fy * 0.65} textAnchor="end" className="cd-basefret">
          {base}
        </text>
      )}
      {Array.from({ length: nFrets + 1 }, (_, i) => (
        <line key={`f${i}`} x1={left} x2={right} y1={top + i * fy} y2={top + i * fy} className="cd-fret" />
      ))}
      {Array.from({ length: 6 }, (_, s) => (
        <line key={`s${s}`} x1={xs(s)} x2={xs(s)} y1={top} y2={bottom} className="cd-string" style={{ strokeWidth: 1.6 - s * 0.15 }} />
      ))}
      {/* cordes à vide / étouffées */}
      {frets.map((f, s) =>
        f === 0 ? (
          <circle key={`o${s}`} cx={xs(s)} cy={top - 13} r={4} className="cd-open" />
        ) : f < 0 ? (
          <text key={`x${s}`} x={xs(s)} y={top - 9} textAnchor="middle" className="cd-mute">
            ×
          </text>
        ) : null,
      )}
      {barre && (
        <rect
          x={xs(barre.from) - 6}
          y={yMid(barre.fret) - 6}
          width={xs(barre.to) - xs(barre.from) + 12}
          height={12}
          rx={6}
          className="cd-dot"
        />
      )}
      {frets.map((f, s) => {
        if (f <= 0) return null
        const underBarre = barre && f === barre.fret && s >= barre.from && s <= barre.to && fingers[s] === 1
        if (underBarre) return null
        return (
          <g key={`d${s}`}>
            <circle cx={xs(s)} cy={yMid(f)} r={7.5} className="cd-dot" />
            {fingers[s] > 0 && (
              <text x={xs(s)} y={yMid(f) + 3.5} textAnchor="middle" className="cd-finger">
                {fingers[s]}
              </text>
            )}
          </g>
        )
      })}
      {barre && (
        <text x={xs(barre.from) - 1} y={yMid(barre.fret) + 3.5} textAnchor="middle" className="cd-finger">
          1
        </text>
      )}
    </svg>
  )
}
