export const ACADEMIC_YEARS = ['2022-23', '2023-24', '2024-25', '2025-26', '2026-27'];

export function deriveAcademicYear(dateStr) {
  if (!dateStr) return getCurrentAcademicYear(); // fallback
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return getCurrentAcademicYear();

  const year = d.getFullYear();
  const m = d.getMonth() + 1; // 1-12

  if (m >= 6) { // Jun to Dec
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else { // Jan to May
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
}

export function getCurrentAcademicYear() {
  const d = new Date();
  const year = d.getFullYear();
  const m = d.getMonth() + 1; // 1-12
  if (m >= 6) { // Jun to Dec
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else { // Jan to May
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
}

export function getMonthStr(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const m = d.toLocaleString('default', { month: 'short' });
  const y = d.getFullYear().toString().slice(-2);
  return `${m}-${y}`;
}

export function generateMonthOrder(academicYear) {
  if (!academicYear) return [];
  const startYearStr = academicYear.split('-')[0];
  const startYear = parseInt(startYearStr, 10);
  if (isNaN(startYear)) return [];

  const endYear = startYear + 1;
  const shortStart = startYear.toString().slice(-2);
  const shortEnd = endYear.toString().slice(-2);

  return [
    `Jun-${shortStart}`, `Jul-${shortStart}`, `Aug-${shortStart}`,
    `Sep-${shortStart}`, `Oct-${shortStart}`, `Nov-${shortStart}`,
    `Dec-${shortStart}`, `Jan-${shortEnd}`, `Feb-${shortEnd}`,
    `Mar-${shortEnd}`, `Apr-${shortEnd}`, `May-${shortEnd}`
  ];
}

export const generateMonthsForAY = generateMonthOrder;
