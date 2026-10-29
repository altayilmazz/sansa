/** Yazı tura parasındaki Tura yüzünün sincap amblemi. */
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
