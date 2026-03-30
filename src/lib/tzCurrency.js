// ─── Timezone & Currency Utility ───────────────────────────────────────────
// Rasya = Vancouver (PDT, UTC-7)
// Everyone else = Jakarta (WIB, UTC+7)
// All money stored internally in CAD; displayed as IDR for non-Rasya.

export const RASYA_NAME = 'Rasya';
export const CAD_TO_IDR = 11500;

// ─── Member helpers ───────────────────────────────────────────────────────────
export function isRasya(member) {
  return member?.name === RASYA_NAME;
}

export function getMemberTz(member) {
  return isRasya(member) ? 'PDT' : 'WIB';
}

// ─── Timezone conversion ──────────────────────────────────────────────────────
// UTC offsets: PDT = -7, WIB = +7
const TZ_OFFSET = { PDT: -7, WIB: 7 };

/**
 * Convert an "HH:MM" string from one timezone to another.
 * Returns null if the day flips (we note it as +1/-1 day via dayDelta).
 */
export function convertTime(timeStr, fromTz, toTz) {
  if (!timeStr) return { time: '', dayDelta: 0 };
  if (fromTz === toTz) return { time: timeStr, dayDelta: 0 };

  const [h, m] = timeStr.split(':').map(Number);
  const diffHours = TZ_OFFSET[toTz] - TZ_OFFSET[fromTz]; // e.g. WIB - PDT = 14
  const totalMinutes = h * 60 + m + diffHours * 60;
  const dayDelta = totalMinutes < 0 ? -1 : totalMinutes >= 1440 ? 1 : 0;
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const newH = Math.floor(normalized / 60);
  const newM = normalized % 60;
  return {
    time: `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`,
    dayDelta,
  };
}

function to12h(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * Given a stored time + the stored TZ, format it correctly for the viewer.
 * e.g. "8:00 PM PDT 🇨🇦" or "10:00 AM WIB 🇮🇩"
 */
export function formatTimeWithTz(storedTime, storedTz, viewerMember) {
  if (!storedTime) return '';
  const viewerTz = getMemberTz(viewerMember);
  const srcTz = storedTz || viewerTz;
  const { time: converted } = convertTime(storedTime, srcTz, viewerTz);
  const flag = viewerTz === 'PDT' ? '🇨🇦' : '🇮🇩';
  return `${to12h(converted)} ${viewerTz} ${flag}`;
}

/**
 * Returns the correct display date string (yyyy-MM-dd) for a viewer,
 * accounting for timezone rollover when the time crosses midnight.
 */
export function getViewerDate(storedDate, storedTime, storedTz, viewerMember) {
  if (!storedDate) return storedDate;
  if (!storedTime) return storedDate;
  const viewerTz = getMemberTz(viewerMember);
  const srcTz = storedTz || viewerTz;
  const { dayDelta } = convertTime(storedTime, srcTz, viewerTz);
  if (dayDelta === 0) return storedDate;
  const [y, mo, d] = storedDate.split('-').map(Number);
  const dt = new Date(y, mo - 1, d + dayDelta);
  const pad = n => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

// ─── Currency ─────────────────────────────────────────────────────────────────
/**
 * All amounts are stored in CAD.
 * Rasya inputs CAD → stored as-is.
 * Family inputs IDR → divided by CAD_TO_IDR before storing.
 */
export function inputToCAD(rawAmount, inputterMember) {
  const n = parseFloat(rawAmount) || 0;
  return isRasya(inputterMember) ? n : n / CAD_TO_IDR;
}

/**
 * Format a stored CAD amount for display based on the viewer's profile.
 */
export function formatCurrency(amountCAD, viewerMember) {
  if (isRasya(viewerMember)) {
    return `$${amountCAD.toFixed(2)} CAD 🇨🇦`;
  }
  const idr = Math.round(amountCAD * CAD_TO_IDR);
  return `Rp ${idr.toLocaleString('id-ID')} 🇮🇩`;
}

/**
 * Returns the placeholder string for amount inputs based on who's entering.
 */
export function amountPlaceholder(member) {
  return isRasya(member) ? '25.00' : '50000';
}

/**
 * Returns the label for the amount input field.
 */
export function amountLabel(member) {
  return isRasya(member) ? 'Amount (CAD 🇨🇦)' : 'Amount (Rp 🇮🇩)';
}