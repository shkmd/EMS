const EARTH_RADIUS_METERS = 6_371_000

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180
}

/** Great-circle (Haversine) distance between two lat/lng points, in meters. */
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_METERS * c
}

/** Whether a given lat/lng falls within `radiusMeters` of the office's
 * configured lat/lng. */
export function isWithinOfficeRadius(
  lat: number,
  lng: number,
  officeLat: number,
  officeLng: number,
  radiusMeters: number
) {
  return distanceMeters(lat, lng, officeLat, officeLng) <= radiusMeters
}
