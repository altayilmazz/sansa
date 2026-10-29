/**
 * Şansa'nın sincabı. Yazı tura parasındaki amblemde ve masaüstündeki
 * imleç takipçisinde aynı çizim kullanılır.
 */
export function SquirrelEmblem({ size = 48, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <g fill={color}>
        <path d="M24 46c-12 0-19-10-15-22 3-9 13-14 19-9 3 2.5 3 7-.5 8.5-4 1.6-7 5-6.5 9.5.4 4 3 6.5 6 8.5z" />
        <ellipse cx="33" cy="43" rx="11" ry="9" />
        <circle cx="43" cy="31" r="7.5" />
        <path d="M39.5 25.5l2.5-7 4 6.5z" />
        <path d="M44 48h5.5v3H41zM25 48.5h7l-1 3h-7z" />
      </g>
      <circle cx="46" cy="30" r="1.4" fill="var(--emblem-eye, #1c1c1e)" />
    </svg>
  )
}

/** Hareketli bacaklarıyla tam sincap (imleç takipçisi). Sağa bakar. */
export function SquirrelFigure() {
  return (
    <svg viewBox="0 0 80 64" width="80" height="64" aria-hidden="true" focusable="false" className="sq-svg">
      {/* kuyruk */}
      <g className="sq-tail">
        <path d="M30 47c-15 1-25-9-22-23 2.5-11 15-18 24-12 5 3.5 4.5 10-.5 12-5.5 2-8.5 6.5-7.5 12 .6 4.2 3.2 7.6 6 11z" fill="#9a5a2b" />
        <path d="M15 20c3-5 9-7.5 13.5-5.5" stroke="#d9a066" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.8" />
      </g>
      {/* arka bacak */}
      <g className="sq-leg sq-leg--back">
        <ellipse cx="34" cy="50" rx="7" ry="5" fill="#a8652f" />
        <path d="M30 53h9l-1 3h-9z" fill="#7d4a22" />
      </g>
      {/* gövde */}
      <ellipse cx="42" cy="44" rx="13" ry="10" fill="#b8733f" />
      <ellipse cx="47" cy="47" rx="7" ry="6" fill="#e9c79a" />
      {/* ön bacak */}
      <g className="sq-leg sq-leg--front">
        <path d="M50 49h5v8h-5z" fill="#a8652f" />
        <path d="M49 56h8l-.5 2.5H49z" fill="#7d4a22" />
      </g>
      {/* baş */}
      <g className="sq-head">
        <circle cx="55" cy="32" r="9" fill="#b8733f" />
        <path d="M51 25l2.5-8.5 4.5 7.5z" fill="#b8733f" />
        <path d="M52.6 23.4l1.2-4.4 2.3 3.8z" fill="#e9a37a" />
        <ellipse cx="61.5" cy="34.5" rx="4" ry="3.2" fill="#e9c79a" />
        <circle cx="64.6" cy="33.6" r="1.3" fill="#2a1a10" />
        <circle cx="58" cy="30" r="1.8" fill="#1c120b" />
        <circle cx="58.6" cy="29.4" r="0.6" fill="#fff" />
      </g>
    </svg>
  )
}
