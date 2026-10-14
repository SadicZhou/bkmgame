/**
 * 简易 Web Audio 提示音（无外部 OST，避免版权问题）
 * @author zjh
 * @date 2026-10-14
 */

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext()
    return ctx
  } catch {
    return null
  }
}

/**
 * 播放短促方波提示
 * @author zjh
 * @date 2026-10-14
 */
export function beep(
  freq = 440,
  duration = 0.08,
  type: OscillatorType = 'square',
  gain = 0.04,
): void {
  const audio = getCtx()
  if (!audio) return
  if (audio.state === 'suspended') void audio.resume()

  const osc = audio.createOscillator()
  const g = audio.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.value = gain
  g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration)
  osc.connect(g)
  g.connect(audio.destination)
  osc.start()
  osc.stop(audio.currentTime + duration)
}

export const Sfx = {
  confirm: () => beep(660, 0.06, 'square', 0.035),
  cancel: () => beep(220, 0.07, 'triangle', 0.03),
  hit: () => beep(180, 0.05, 'sawtooth', 0.04),
  win: () => {
    beep(523, 0.08)
    setTimeout(() => beep(659, 0.08), 90)
    setTimeout(() => beep(784, 0.12), 180)
  },
  step: () => beep(140, 0.03, 'triangle', 0.015),
  talk: () => beep(400, 0.04, 'square', 0.025),
}
