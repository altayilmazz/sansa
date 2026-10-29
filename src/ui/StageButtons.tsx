import type { ReactNode } from 'react'
import { haptic, sfx } from '../features/sound'
import { Icon, type IconName } from './Icon'

interface RoundProps {
  /** Ekran okuyucu etiketi; düğme yalnızca simge ya da kısa işaret taşır. */
  label: string
  icon?: IconName
  /** Simge yerine kısa işaret (ör. "I", "II", "Vs"). */
  children?: ReactNode
  /** Seçili/açık durumu; verilirse düğme basılı-değil/basılı olarak duyurulur. */
  on?: boolean
  pill?: boolean
  disabled?: boolean
  onClick: () => void
  className?: string
}

/** Sahnenin içindeki yuvarlak simge düğmesi (parmakla erişim için alt köşelerde durur). */
export function RoundButton({ label, icon, children, on, pill, disabled, onClick, className = '' }: RoundProps) {
  return (
    <button
      type="button"
      className={`sbtn${on ? ' is-on' : ''}${pill ? ' sbtn--pill' : ''} ${className}`}
      aria-label={label}
      title={label}
      aria-pressed={on === undefined ? undefined : on}
      disabled={disabled}
      onClick={() => {
        sfx.tap()
        haptic(8)
        onClick()
      }}
    >
      {icon ? <Icon name={icon} size={20} /> : children}
    </button>
  )
}

/** Sahnenin alt kenarı: solda, ortada ve sağda birer düğme grubu. */
export function StageBar({ left, center, right }: { left?: ReactNode; center?: ReactNode; right?: ReactNode }) {
  return (
    <div className="stagebar">
      <div className="stagebar__l">{left}</div>
      <div className="stagebar__c">{center}</div>
      <div className="stagebar__r">{right}</div>
    </div>
  )
}
