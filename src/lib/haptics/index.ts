// Haptic feedback system
// Android: Vibration API (navigator.vibrate)
// iOS: AudioContext-based sub-perceptual pulse that triggers Taptic Engine
// Falls back silently on unsupported platforms

let hapticEnabled = true;
let audioContext: AudioContext | null = null;

export function setHapticEnabled(value: boolean) {
  hapticEnabled = value;
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    try {
      audioContext = new AudioContext();
    } catch {
      return null;
    }
  }
  return audioContext;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function supportsVibration(): boolean {
  return typeof navigator !== "undefined" && "vibrate" in navigator;
}

// iOS haptic simulation: play a very short, low-frequency oscillation
// This triggers the Taptic Engine on iOS Safari when combined with user interaction
function iosHapticPulse(intensity: "light" | "medium" | "heavy" = "light") {
  const ctx = getContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";

    const config = {
      light: { freq: 10, duration: 0.015, volume: 0.3 },
      medium: { freq: 15, duration: 0.025, volume: 0.5 },
      heavy: { freq: 20, duration: 0.04, volume: 0.7 },
    }[intensity];

    osc.frequency.setValueAtTime(config.freq, ctx.currentTime);
    gain.gain.setValueAtTime(config.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + config.duration
    );

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + config.duration);
  } catch {
    // fail silently
  }
}

// Light tap: button presses, selections
export function hapticTap() {
  if (!hapticEnabled) return;

  if (supportsVibration()) {
    navigator.vibrate(10);
  } else if (isIOS()) {
    iosHapticPulse("light");
  }
}

// Medium impact: successful action, card flip
export function hapticSuccess() {
  if (!hapticEnabled) return;

  if (supportsVibration()) {
    navigator.vibrate([15, 50, 15]);
  } else if (isIOS()) {
    iosHapticPulse("medium");
  }
}

// Strong impact: achievement, level up
export function hapticHeavy() {
  if (!hapticEnabled) return;

  if (supportsVibration()) {
    navigator.vibrate([20, 40, 30, 40, 20]);
  } else if (isIOS()) {
    iosHapticPulse("heavy");
    // Double pulse for emphasis
    setTimeout(() => iosHapticPulse("medium"), 80);
  }
}

// Error / streak reset
export function hapticError() {
  if (!hapticEnabled) return;

  if (supportsVibration()) {
    navigator.vibrate([30, 100, 30]);
  } else if (isIOS()) {
    iosHapticPulse("medium");
    setTimeout(() => iosHapticPulse("medium"), 120);
  }
}
