export function calculateBackgroundColorBasedOnProbability(
  probability: number,
  maxProbability?: number
) {
  return hueToBackgroundColor(
    calculateHueBasedOnProbability(probability, maxProbability)
  );
}

export function hueToBackgroundColor(hue: number, opacity = 0.25): string {
  return `hsl(${hue}, 100%, 50%, ${opacity})`;
}

export function calculateHueBasedOnProbability(
  probability: number,
  maxProbability?: number
): number {
  // Ensure the value is clamped between 0 and 1
  let scaledValue = Math.min(Math.max(probability, 0), 1);
  if (maxProbability) {
    // If maxProbability is provided, scale the value accordingly
    scaledValue = Math.min(scaledValue / maxProbability, 1);
  }

  // Apply logarithmic scaling: maps [0,1] to [0,1] so that small values are more pronounced
  scaledValue = Math.log10(scaledValue * 9 + 1);
  let hue;
  if (scaledValue <= 0.5) {
    // For 0 <= scaledValue <= 0.5, interpolate from red (0°) to orange (30°)
    const t = scaledValue / 0.5; // Normalize to [0, 1]
    hue = 0 + t * 30; // 0° to 30°
  } else {
    // For 0.5 < scaledValue <= 1, interpolate from orange (30°) to green (120°)
    const t = (scaledValue - 0.5) / 0.5; // Normalize to [0, 1]
    hue = 30 + t * (120 - 30); // 30° to 120°
  }
  // Return the HSL color string with full saturation and medium lightness
  return hue;
}
