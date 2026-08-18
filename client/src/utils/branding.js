export function getBrandName(salonName) {
  const fullName = String(salonName || '').trim();
  const shortName = fullName.replace(/\s+nail studio$/i, '').trim();
  return shortName || fullName || 'Blush';
}
