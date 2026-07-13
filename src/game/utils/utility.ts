import Phaser from 'phaser'

export type SharedCountdownOptions = {
  totalSeconds?: number
  registryKey?: string
  tickRate?: number
}

export function startOrResumeSharedCountdown(
  scene: Phaser.Scene,
  onTick: (remainingSeconds: number) => void,
  options: SharedCountdownOptions = {}
) {
  const {
    totalSeconds = 600,
    registryKey = 'hahalandGameEndTime',
    tickRate = 250,
  } = options

  let endTime = scene.registry.get(registryKey) as
    | number
    | undefined

  // Create the countdown only when it does not already exist.
  if (typeof endTime !== 'number') {
    endTime = Date.now() + totalSeconds * 1000
    scene.registry.set(registryKey, endTime)
  }

  const getRemainingSeconds = () => {
    return Math.max(
      0,
      Math.ceil((endTime! - Date.now()) / 1000)
    )
  }

  const updateTimer = () => {
    const remainingSeconds = getRemainingSeconds()

    onTick(remainingSeconds)

    if (remainingSeconds <= 0) {
      timerEvent.remove(false)
    }
  }

  const timerEvent = scene.time.addEvent({
    delay: tickRate,
    loop: true,
    callback: updateTimer,
  })

  // Show the correct time immediately.
  updateTimer()

  const stop = () => {
    timerEvent.remove(false)
  }

  scene.events.once(
    Phaser.Scenes.Events.SHUTDOWN,
    stop
  )

  return {
    timerEvent,
    stop,
    getRemainingSeconds,
  }
}

export function resetSharedCountdown(
  scene: Phaser.Scene,
  totalSeconds = 600,
  registryKey = 'hahalandGameEndTime'
) {
  const endTime = Date.now() + totalSeconds * 1000

  scene.registry.set(registryKey, endTime)

  return endTime
}

export function clearSharedCountdown(
  scene: Phaser.Scene,
  registryKey = 'hahalandGameEndTime'
) {
  scene.registry.remove(registryKey)
}