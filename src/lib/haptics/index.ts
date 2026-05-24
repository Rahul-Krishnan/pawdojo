// Haptic feedback system
// Android: Vibration API (navigator.vibrate)
// iOS: AudioContext-based sub-perceptual pulse that triggers Taptic Engine
// Falls back silently on unsupported platforms

let hapticEnabled = true;

export function setHapticEnabled(value: boolean) {
  hapticEnabled = value;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function supportsVibration(): boolean {
  return typeof navigator !== "undefined" && "vibrate" in navigator;
}

// Light tap: button presses, selections
export function hapticTap() {
  if (!hapticEnabled) return;

  if (supportsVibration()) {
    navigator.vibrate(10);
  }
}

// Medium impact: successful action, card flip
export function hapticSuccess() {
  if (!hapticEnabled) return;

  if (supportsVibration()) {
    navigator.vibrate([15, 50, 15]);
  }
}

// Strong impact: achievement, level up
export function hapticHeavy() {
  if (!hapticEnabled) return;

  if (supportsVibration()) {
    navigator.vibrate([20, 40, 30, 40, 20]);
  }
}

// Error / streak reset
export function hapticError() {
  if (!hapticEnabled) return;

  if (supportsVibration()) {
    navigator.vibrate([30, 100, 30]);
  }
}
