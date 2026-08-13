// Small geo helpers — haversine distance + bearing, no deps.

const R_M = 6371000; // earth radius, meters

function toRad(deg) { return (deg * Math.PI) / 180; }

/** Distance in meters between two lat/lng points. */
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R_M * c;
}

export function metersToFeet(m) { return m * 3.28084; }

/** Compass bearing (0-360, 0=N) from point 1 to point 2. */
export function bearing(lat1, lng1, lat2, lng2) {
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export function bearingToCompass(deg) {
  return DIRS[Math.round(deg / 45) % 8];
}

/** Given a target sample and a list of candidates, find the nearest (excluding same id). */
export function nearestSample(target, samples) {
  let best = null;
  let bestDist = Infinity;
  for (const s of samples) {
    if (!s || s.id === target.id) continue;
    if (s.lat == null || s.lng == null) continue;
    const d = distanceMeters(target.lat, target.lng, s.lat, s.lng);
    if (d < bestDist) { bestDist = d; best = s; }
  }
  if (!best) return null;
  return { sample: best, distanceM: bestDist, distanceFt: metersToFeet(bestDist), dir: bearingToCompass(bearing(best.lat, best.lng, target.lat, target.lng)) };
}
