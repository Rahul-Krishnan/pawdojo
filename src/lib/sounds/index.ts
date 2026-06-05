import { hapticTap, hapticSuccess, hapticHeavy, hapticError } from "@/lib/haptics";

let audioContext: AudioContext | null = null;
let muted = false;

function getContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

export function setMuted(value: boolean) {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume: number = 0.15,
  delay: number = 0
) {
  if (muted) return;
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch {
    // Audio not available, fail silently
  }
}

// Tap sound: short, subtle click
export function playTap() {
  playTone(800, 0.05, "sine", 0.08);
  hapticTap();
}

// Success: ascending two-note chime
export function playSuccess() {
  playTone(523, 0.15, "sine", 0.12); // C5
  playTone(659, 0.2, "sine", 0.12, 0.1); // E5
  hapticSuccess();
}

// XP earned: bright coin-like ding
export function playXpEarned() {
  playTone(880, 0.1, "sine", 0.1); // A5
  playTone(1109, 0.15, "sine", 0.1, 0.08); // C#6
}

// Streak: quick ascending sweep
export function playStreak() {
  playTone(392, 0.1, "triangle", 0.1); // G4
  playTone(523, 0.1, "triangle", 0.1, 0.08); // C5
  playTone(659, 0.15, "triangle", 0.1, 0.16); // E5
}

// Badge unlocked: triumphant fanfare
export function playBadgeUnlock() {
  playTone(523, 0.15, "sine", 0.12); // C5
  playTone(659, 0.15, "sine", 0.12, 0.12); // E5
  playTone(784, 0.15, "sine", 0.12, 0.24); // G5
  playTone(1047, 0.3, "sine", 0.15, 0.36); // C6
  hapticHeavy();
}

// Level up: dramatic ascending scale
export function playLevelUp() {
  const notes = [523, 587, 659, 784, 880, 1047]; // C5 to C6
  notes.forEach((freq, i) => {
    playTone(freq, 0.12, "sine", 0.1, i * 0.08);
  });
  hapticHeavy();
}

// Error/reset: descending two-note
export function playError() {
  playTone(440, 0.15, "sine", 0.08); // A4
  playTone(330, 0.2, "sine", 0.08, 0.12); // E4
  hapticError();
}
