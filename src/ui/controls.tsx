import { motion } from 'motion/react'
import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { haptic, sfx } from '../features/sound'
import { Icon, type IconName } from './Icon'

type Variant = 'primary' | 'secondary' | 'plain' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: IconName
  size?: 'md' | 'lg'
  block?: boolean
}

export function Button({ variant = 'secondary', icon, size = 'md', block, className = '', children, onClick, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={`btn btn--${variant} btn--${size}${block ? ' btn--block' : ''} ${className}`}
      onClick={(e) => {
        if (variant !== 'primary') sfx.tap()
        onClick?.(e)
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'lg' ? 22 : 18} />}
      {children && <span>{children}</span>}
    </button>
  )
}

export function IconButton({ icon, label, className = '', ...rest }: { icon: IconName; label: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`icon-btn ${className}`} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={20} />
    </button>
  )
}

interface SegOption<T extends string> {
  value: T
  label: string
}

/** iOS tarzı segment kontrol; seçili zemin yay hareketiyle kayar. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled,
}: {
  options: SegOption<T>[]
  value: T
  onChange: (v: T) => void
  label: string
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="seg" role="radiogroup" aria-label={label} aria-disabled={disabled || undefined}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            className={`seg__opt${on ? ' is-on' : ''}`}
            disabled={disabled}
            onClick={() => {
              if (!on) {
                haptic(8)
                onChange(o.value)
              }
            }}
          >
            {on && <motion.span layoutId={`seg-${id}`} className="seg__thumb" style={{ borderRadius: 999 }} transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }} />}
            <span className="seg__label">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
  disabled,
  format = (n) => String(n),
}: {
  value: number
  min: number
  max: number
  onChange: (n: number) => void
  label: string
  disabled?: boolean
  format?: (n: number) => string
}) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="stepper__btn" aria-label={`${label}: azalt`} disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <Icon name="minus" size={18} />
      </button>
      <output className="stepper__value" aria-live="polite">
        {format(value)}
      </output>
      <button type="button" className="stepper__btn" aria-label={`${label}: artır`} disabled={disabled || value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <Icon name="plus" size={18} />
      </button>
    </div>
  )
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`switch${checked ? ' is-on' : ''}`}
      onClick={() => {
        haptic(8)
        onChange(!checked)
      }}
    >
      <motion.span className="switch__knob" layout transition={{ type: 'spring', bounce: 0.25, duration: 0.3 }} />
    </button>
  )
}

/** Gruplanmış ayar satırı (iOS ayarlar listesi). */
export function Row({ label, hint, children, htmlFor }: { label: ReactNode; hint?: ReactNode; children?: ReactNode; htmlFor?: string }) {
  return (
    <div className="row">
      <div className="row__text">
        {htmlFor ? (
          <label className="row__label" htmlFor={htmlFor}>
            {label}
          </label>
        ) : (
          <span className="row__label">{label}</span>
        )}
        {hint && <span className="row__hint">{hint}</span>}
      </div>
      {children && <div className="row__control">{children}</div>}
    </div>
  )
}

export function Group({ title, footer, children, id }: { title?: ReactNode; footer?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="group" aria-labelledby={title && id ? id : undefined}>
      {title && (
        <h3 className="group__title" id={id}>
          {title}
        </h3>
      )}
      <div className="group__body">{children}</div>
      {footer && <div className="group__footer">{footer}</div>}
    </section>
  )
}

export function Notice({ tone = 'info', children, id }: { tone?: 'info' | 'warn' | 'error'; children: ReactNode; id?: string }) {
  return (
    <p className={`notice notice--${tone}`} id={id} role={tone === 'error' ? 'alert' : undefined}>
      <Icon name="info" size={16} />
      <span>{children}</span>
    </p>
  )
}
