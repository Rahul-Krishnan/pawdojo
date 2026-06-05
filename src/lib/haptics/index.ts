// Haptic feedback via the Vibration API (navigator.vibrate). Unsupported on iOS Safari, where these calls no-op.

let hapticEnabled = true;

export function setHapticEnabled(value: boolean) {
  hapticEnabled = value;
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
