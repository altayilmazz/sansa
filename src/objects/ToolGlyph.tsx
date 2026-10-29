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
      {tool === 'mayin' && (
        <g>
          <circle cx="16" cy="17" r="8" style={f('m1')} />
          {[0, 45, 90, 135].map((a) => (
            <rect key={a} x="14.6" y="4" width="2.8" height="26" rx="1.4" style={f('m1')} transform={`rotate(${a} 16 17)`} />
          ))}
          <circle cx="13" cy="14" r="2.2" style={{ fill: 'var(--g-m2)' }} />
          <path d="M20 5.5c1.8-1.4 3.6-1.4 5-.2" fill="none" style={{ stroke: 'var(--g-m2)' }} strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
      {tool === 'sayi' && (
        <g>
          <rect x="3" y="4" width="26" height="24" rx="7" style={f('s1')} />
          <text x="16" y="21.5" textAnchor="middle" fontSize="15" fontWeight="800" style={f('s2')} fontFamily="var(--font)">
            42
          </text>
        </g>
      )}
      {tool === 'parmak' && (
        <g>
          {[
            [9, 11, 'f1'],
            [22, 9, 'f2'],
            [16, 22, 'f1'],
          ].map(([x, y, c]) => (
            <g key={`${x}${y}`}>
              <circle cx={x as number} cy={y as number} r="6.4" fill="none" style={{ stroke: `var(--g-${c})` }} strokeWidth="1.6" opacity="0.6" />
              <circle cx={x as number} cy={y as number} r="3.6" style={f(c as string)} />
            </g>
          ))}
        </g>
      )}
      {tool === 'rulet' && (
        <g>
          <circle cx="16" cy="16" r="13" style={f('u1')} />
          <circle cx="16" cy="16" r="3" style={f('u2')} />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i * 60 * Math.PI) / 180
            return <circle key={i} cx={16 + 8 * Math.sin(a)} cy={16 - 8 * Math.cos(a)} r="2.6" style={f(i === 0 ? 'u2' : 'c0')} opacity={i === 0 ? 1 : 0.9} />
          })}
        </g>
      )}
      {tool === 'cop' && (
        <g>
          <rect x="6" y="3" width="4.6" height="26" rx="2.3" style={f('u2')} />
          <rect x="13.7" y="3" width="4.6" height="14" rx="2.3" style={f('f1')} />
          <rect x="21.4" y="3" width="4.6" height="26" rx="2.3" style={f('u2')} />
          <rect x="3" y="20" width="26" height="9" rx="4.5" style={f('u1')} />
        </g>
      )}
      {tool === 'sicak' && (
        <g>
          <ellipse cx="16" cy="19" rx="12" ry="9.5" style={f('u2')} />
          <circle cx="12" cy="17" r="1.4" style={f('u1')} />
          <circle cx="19" cy="21" r="1.4" style={f('u1')} />
          <path d="M16 10c0-3 1-5 4-6" fill="none" style={{ stroke: 'var(--g-f1)' }} strokeWidth="2" strokeLinecap="round" />
          <circle cx="21" cy="4" r="2.4" style={f('f1')} />
        </g>
      )}
      {tool === 'kutu' && (
        <g>
          <circle cx="16" cy="25" r="3.4" style={f('f1')} />
          <path d="M7 5h18l-2.6 17H9.6z" style={f('u2')} />
          <path d="M9.6 22h12.8" style={{ stroke: 'var(--g-u1)' }} strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
      {tool === 'top8' && (
        <g>
          <circle cx="16" cy="16" r="13" style={f('u1')} />
          <circle cx="16" cy="12" r="6" style={f('u2')} />
          <path d="M16 8.5l3 5h-6z" style={f('u1')} />
        </g>
      )}
      {tool === 'satranc' && (
        <g>
          <rect x="3" y="3" width="26" height="26" rx="5" style={f('c2x')} />
          {[0, 1, 2, 3].flatMap((r) => [0, 1, 2, 3].map((c) => ((r + c) % 2 === 0 ? <rect key={`${r}${c}`} x={3 + c * 6.5} y={3 + r * 6.5} width="6.5" height="6.5" style={f('c1x')} opacity="0.9" /> : null)))}
          <path d="M16 7l1.6 3.4h2L19 13h-6l-.6-2.6h2z" style={f('c0')} />
          <rect x="12" y="13" width="8" height="9" rx="2" style={f('c0')} />
        </g>
      )}
    </svg>
  )
}
