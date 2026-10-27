/**
 * US Navy circumference method, men (Hodgdon & Beckett, 1984), metric form:
 *
 *   BF% = 495 / (1.0324 − 0.19077·log10(waist − neck) + 0.15456·log10(height)) − 450
 *
 * waist = at the navel, neck = just below the larynx, height; all in cm.
 * Typical error vs lab methods is about ±3–4 percentage points per reading, but with the same
 * tape and the same measuring spots the week-to-week trend is consistent.
 *
 * Returns null when inputs are missing or out of a plausible range, rather than a misleading number.
 */
export function navyBodyFatMale(
  waistCm: number | null | undefined,
  neckCm: number | null | undefined,
  heightCm: number | null | undefined,
): number | null {
  if (waistCm == null || neckCm == null || heightCm == null) return null;
  if (![waistCm, neckCm, heightCm].every(Number.isFinite)) return null;
  if (heightCm < 120 || heightCm > 230 || neckCm < 20 || waistCm <= neckCm) return null;

  const density = 1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm);
  const pct = 495 / density - 450;
  if (!Number.isFinite(pct) || pct < 2 || pct > 70) return null;
  return Math.round(pct * 10) / 10;
}
