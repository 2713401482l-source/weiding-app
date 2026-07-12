export function getNearestStateIndex(clientX, clientY, rect, count = 6) {
  const x = clientX - (rect.left + rect.width / 2);
  const y = clientY - (rect.top + rect.height / 2);
  const degrees = Math.atan2(y, x) * (180 / Math.PI);
  const normalized = (degrees + 90 + 360) % 360;
  return Math.round(normalized / (360 / count)) % count;
}
