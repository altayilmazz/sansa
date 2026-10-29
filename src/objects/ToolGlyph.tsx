import type { CSSProperties } from 'react'
import type { ToolId } from '../state/tools'

/** Renk, temaya göre tokens.css içindeki --g-* değişkenlerinden gelir. */
const f = (name: string): CSSProperties => ({ fill: `var(--g-${name})` })
const outline: CSSProperties = { stroke: 'var(--g-ln)', strokeWidth: 1 }

/** Gezinme ve ana ekran için aynı çizim dilinde küçük nesne glifleri. */
export function ToolGlyph({ tool, size = 28 }: { tool: ToolId; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="glyph">
      {tool === 'takim' && (
        <g>
          <rect x="2" y="5" width="12.5" height="22" rx="4" style={f('t1')} opacity="0.22" />
          <rect x="17.5" y="5" width="12.5" height="22" rx="4" style={f('t2')} opacity="0.22" />
          {[10, 16, 22].map((y) => (
            <circle key={`a${y}`} cx="8.25" cy={y} r="2.4" style={f('t1')} />
          ))}
          {[10, 16, 22].map((y) => (
            <circle key={`b${y}`} cx="23.75" cy={y} r="2.4" style={f('t2')} />
          ))}
        </g>
      )}
      {tool === 'cark' && (
        <g>
          <circle cx="16" cy="17" r="13" style={f('c0')} />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a0 = (i * 60 - 90) * (Math.PI / 180)
            const a1 = ((i + 1) * 60 - 90) * (Math.PI / 180)
            const d = `M16 17 L${16 + 12 * Math.cos(a0)} ${17 + 12 * Math.sin(a0)} A12 12 0 0 1 ${16 + 12 * Math.cos(a1)} ${17 + 12 * Math.sin(a1)} Z`
            return <path key={i} d={d} style={f(['c1', 'c2', 'c3'][i % 3])} />
          })}
          <circle cx="16" cy="17" r="3" style={{ ...f('ch'), stroke: 'var(--g-c2)', strokeWidth: 1.2 }} />
          <path d="M13 1.5h6L16 6z" style={f('cl')} />
        </g>
      )}
      {tool === 'kura' && (
        <g>
          <path d="M5 9h22v16H5z" style={f('k1')} />
          <path d="M5 9l11 9 11-9" style={f('k2')} />
          <path d="M5 9l11 9 11-9" fill="none" style={{ stroke: 'var(--g-k3)' }} strokeWidth="1" />
          <rect x="11" y="3.5" width="10" height="9" rx="1.5" style={{ ...f('k4'), ...outline }} transform="rotate(-8 16 8)" />
        </g>
      )}
      {tool === 'para' && (
        <g>
          <circle cx="16" cy="16" r="13" style={f('p1')} />
          <circle cx="16" cy="15" r="13" style={f('p2')} />
          <circle cx="16" cy="15" r="10" fill="none" style={{ stroke: 'var(--g-p1)' }} strokeWidth="1.2" strokeDasharray="1.4 1.6" />
          <text x="16" y="20" textAnchor="middle" fontSize="13" fontWeight="700" style={f('p3')} fontFamily="var(--font)">
            1
          </text>
        </g>
      )}
      {tool === 'zar' && (
        <g>
          <rect x="4" y="4" width="24" height="24" rx="6" style={{ ...f('z1'), ...outline }} />
          <rect x="4" y="24" width="24" height="4" rx="2" style={f('z2')} />
          {[
            [10, 10],
            [22, 10],
            [16, 16],
            [10, 22],
            [22, 22],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y - 1} r="2.3" style={f(i === 2 ? 'z4' : 'z3')} />
          ))}
        </g>
      )}
      {tool === 'kart' && (
        <g>
          <rect x="3" y="6" width="16" height="22" rx="3" style={f('r1')} transform="rotate(-12 11 17)" />
          <rect x="12" y="4" width="16" height="22" rx="3" style={{ ...f('r2'), ...outline }} transform="rotate(8 20 15)" />
          <path d="M20.4 20.6s-4-2.5-5-4.9c-.9-2 .3-4.1 2.3-4.1 1.2 0 2 .7 2.7 1.7.8-1 1.6-1.7 2.8-1.7 2 0 3.2 2.1 2.3 4.1-1.1 2.4-5.1 4.9-5.1 4.9z" style={f('r3')} transform="rotate(8 20 15)" />
        </g>
      )}
    </svg>
  )
}
