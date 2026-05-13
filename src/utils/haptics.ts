type HapticIntensity = "light" | "medium" | "heavy" | "success" | "warning" | "error";

const patterns: Record<HapticIntensity, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 30],
  warning: [30, 30, 30],
  error: [50, 100, 50],
};

/**
 * Trigger haptic feedback using the Vibration API
 * Falls back silently on devices that don't support vibration
 */
export function hapticFeedback(intensity: HapticIntensity = "light"): void {
  if (!("vibrate" in navigator)) return;

  try {
    const pattern = patterns[intensity];
    navigator.vibrate(pattern);
  } catch {
    // Silently fail on devices that don't support vibration
  }
}

/**
 * Check if haptic feedback is available
 */
export function isHapticSupported(): boolean {
  return "vibrate" in navigator;
}
