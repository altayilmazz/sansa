/**
 * Küçük, sentezlenmiş sesler (dosya yok). Varsayılan olarak kapalıdır;
 * yalnızca ayarlardan açıldığında ve bir kullanıcı etkileşiminden sonra çalar.
 */
let ctx: AudioContext | null = null
let enabled = false

export function setSoundEnabled(on: boolean) {
  enabled = on
}

function audio(): AudioContext | null {
  if (!enabled) return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.08, when = 0) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + when
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

function noise(dur: number, gain = 0.05, when = 0, hp = 1200) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + when
  const len = Math.max(1, Math.floor(a.sampleRate * dur))
  const buf = a.createBuffer(1, len, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = a.createBufferSource()
  src.buffer = buf
  const f = a.createBiquadFilter()
  f.type = 'highpass'
  f.frequency.value = hp
  const g = a.createGain()
  g.gain.value = gain
  src.connect(f).connect(g).connect(a.destination)
  src.start(t)
}

export const sfx = {
  tap: () => tone(520, 0.05, 'triangle', 0.04),
  tick: () => noise(0.025, 0.06, 0, 2500),
  whoosh: () => noise(0.35, 0.035, 0, 600),
  coin: () => {
    tone(2100, 0.25, 'sine', 0.04)
    tone(3150, 0.18, 'sine', 0.02, 0.01)
  },
  dice: () => {
    for (let i = 0; i < 4; i++) noise(0.04, 0.08, i * 0.07, 900)
  },
  card: () => noise(0.08, 0.05, 0, 1800),
  reveal: () => {
    tone(660, 0.14, 'triangle', 0.05)
    tone(990, 0.22, 'triangle', 0.05, 0.09)
  },
  win: () => {
    tone(523, 0.14, 'triangle', 0.05)
    tone(659, 0.14, 'triangle', 0.05, 0.1)
    tone(784, 0.3, 'triangle', 0.05, 0.2)
  },
}

/** Destekleyen cihazlarda kısa titreşim (Android). Ses ayarına bağlı değildir. */
export function haptic(ms = 12) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* desteklenmiyor */
  }
}
