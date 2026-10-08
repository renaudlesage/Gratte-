import { useMemo, useState } from 'react'
import { useProgress } from '../lib/progress.jsx'
import { useSettings } from '../lib/settings.jsx'
import { computeBadges, heatmap, maxStreak } from '../lib/badges.js'

const level = (n) => (n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : 4)
const frDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' })

export default function Progress() {
  const p = useProgress()
  const { label } = useSettings()
  const badges = computeBadges(p)
  const earned = badges.filter((b) => b.earned).length
  const cells = useMemo(() => heatmap(p.days, p.activity), [p.days, p.activity])
  const weeks = Math.ceil(cells.length / 7)

  const pairs = [...new Set(p.history.map((h) => h.pair))]
  const [pair, setPair] = useState(pairs[0] || null)
  const series = (pair ? p.history.filter((h) => h.pair === pair) : []).map((h) => ({ date: h.date, v: h.count }))
  const rhythmSeries = p.activity.filter((a) => a.type === 'rhythmscore').map((a) => ({ date: a.date, v: a.value, key: a.key }))

  return (
    <div className="progress-page">
      <div className="stats">
        <div className="stat">
          <strong>{p.streak}</strong>
          <span>série actuelle</span>
        </div>
        <div className="stat">
          <strong>{maxStreak(p.days)}</strong>
          <span>meilleure série</span>
        </div>
        <div className="stat">
          <strong>{p.days.length}</strong>
          <span>jours de pratique</span>
        </div>
      </div>

      <h3 className="section-title">Calendrier de pratique</h3>
      <div className="heat-scroll">
        <div className="heat" style={{ gridTemplateColumns: `22px repeat(${weeks}, 14px)` }} role="img" aria-label={`Pratique des ${weeks} dernières semaines`}>
          {['L', '', 'M', '', 'V', '', 'D'].map((d, i) => (
            <span key={`d${i}`} className="heat-dow" style={{ gridRow: i + 1, gridColumn: 1 }}>{d}</span>
          ))}
          {cells.map((c, i) => (
            <span
              key={c.date}
              className={`heat-cell l${level(c.count)}`}
              style={{ gridRow: c.dow + 1, gridColumn: Math.floor(i / 7) + 2 }}
              title={`${frDate(c.date)} : ${c.count ? `${c.count} activité${c.count > 1 ? 's' : ''}` : 'pas de pratique'}`}
            />
          ))}
        </div>
      </div>
      <div className="heat-legend" aria-hidden>
        <span>moins</span>
        {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`heat-cell l${l}`} />)}
        <span>plus</span>
      </div>

      <h3 className="section-title">Défi minute : vos résultats</h3>
      {pairs.length === 0 ? (
        <p className="muted">Faites un premier défi minute pour voir votre courbe de progression ici.</p>
      ) : (
        <>
          <div className="chips">
            {pairs.map((k) => (
              <button key={k} className={`chip${k === pair ? ' on' : ''}`} onClick={() => setPair(k)}>{k.split('|').map(label).join(' ↔ ')}</button>
            ))}
          </div>
          <LineChart data={series} unit="changements" title={`Changements par minute, ${pair.split('|').map(label).join(' ↔ ')}`} />
        </>
      )}

      {rhythmSeries.length > 0 && (
        <>
          <h3 className="section-title">Évaluations de rythme</h3>
          <LineChart data={rhythmSeries} unit="%" max={100} title="Coups dans le temps (%)" />
        </>
      )}

      <h3 className="section-title">Badges · {earned}/{badges.length}</h3>
      <div className="badges">
        {badges.map((b) => (
          <div key={b.id} className={`badge${b.earned ? ' earned' : ''}`}>
            <span className="badge-icon" aria-hidden>{b.earned ? b.icon : '🔒'}</span>
            <strong>{b.title}</strong>
            <small>{b.desc}</small>
          </div>
        ))}
      </div>
    </div>
  )
}

// Courbe simple : une valeur par tentative, survol pour le détail
function LineChart({ data, unit, title, max }) {
  const [hover, setHover] = useState(null)
  if (!data.length) return null
  const W = 340
  const H = 160
  const pad = { l: 34, r: 12, t: 12, b: 26 }
  const top = max ?? Math.max(10, Math.ceil((Math.max(...data.map((d) => d.v)) * 1.15) / 10) * 10)
  const x = (i) => pad.l + (data.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (data.length - 1))
  const y = (v) => pad.t + (1 - v / top) * (H - pad.t - pad.b)
  const ticks = [0, top / 2, top]
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.v).toFixed(1)}`).join(' ')
  const best = data.reduce((a, d, i) => (d.v >= data[a].v ? i : a), 0)
  const h = hover !== null ? data[hover] : null
  return (
    <figure className="chart">
      <figcaption className="small muted">{title}</figcaption>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title} : ${data.length} mesures, meilleur ${data[best].v} ${unit}`} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="chart-grid" />
              <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" className="chart-tick">{Math.round(t)}</text>
            </g>
          ))}
          <text x={pad.l} y={H - 8} className="chart-tick">{frDate(data[0].date)}</text>
          {data.length > 1 && <text x={W - pad.r} y={H - 8} textAnchor="end" className="chart-tick">{frDate(data[data.length - 1].date)}</text>}
          {data.length > 1 && <path d={path} className="chart-line" />}
          {data.map((d, i) => (
            <g key={i}>
              <circle cx={x(i)} cy={y(d.v)} r={i === best || i === hover ? 5 : 3.5} className={`chart-dot${i === best ? ' best' : ''}`} />
              <rect
                x={x(i) - Math.max(8, (W - pad.l - pad.r) / data.length / 2)}
                y={pad.t}
                width={Math.max(16, (W - pad.l - pad.r) / data.length)}
                height={H - pad.t - pad.b}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onTouchStart={() => setHover(i)}
              />
            </g>
          ))}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} className="chart-cross" />}
        </svg>
        <div className="chart-tip" aria-live="polite">
          {h ? `${frDate(h.date)} : ${h.v} ${unit}${h.key ? ` (${h.key})` : ''}` : `Meilleur : ${data[best].v} ${unit}, le ${frDate(data[best].date)}`}
        </div>
      </div>
    </figure>
  )
}
