// Structures de santé de Kinshasa. Coordonnées et téléphones APPROXIMATIFS :
// à vérifier sur le terrain avant tout usage réel.

export interface Hospital {
  id: string;
  name: string;
  commune: string;
  lat: number;
  lng: number;
  services: string;
}

export const HOSPITALS: Hospital[] = [
  { id: 'cuk', name: 'Cliniques Universitaires de Kinshasa', commune: 'Lemba', lat: -4.4196, lng: 15.3086, services: 'Urgences, diabétologie' },
  { id: 'hgr', name: 'Hôpital Général de Référence de Kinshasa', commune: 'Gombe', lat: -4.3127, lng: 15.301, services: 'Urgences 24 h/24' },
  { id: 'cinq', name: 'Hôpital du Cinquantenaire', commune: 'Kasa-Vubu', lat: -4.3333, lng: 15.31, services: 'Urgences, laboratoire' },
  { id: 'ngaliema', name: 'Centre Hospitalier Ngaliema', commune: 'Gombe', lat: -4.305, lng: 15.287, services: 'Urgences, médecine interne' },
  { id: 'cmk', name: 'Centre Médical de Kinshasa (CMK)', commune: 'Gombe', lat: -4.307, lng: 15.301, services: 'Urgences, laboratoire' },
  { id: 'monkole', name: 'Centre Hospitalier Monkole', commune: 'Mont-Ngafula', lat: -4.43, lng: 15.27, services: 'Urgences, diabétologie' },
  { id: 'stjoseph', name: 'Hôpital Saint-Joseph', commune: 'Limete', lat: -4.3586, lng: 15.343, services: 'Urgences, médecine interne' },
  { id: 'biamba', name: 'Hôpital Biamba Marie Mutombo', commune: 'Masina', lat: -4.39, lng: 15.4, services: 'Urgences, laboratoire' },
  { id: 'kingasani', name: 'Centre Hospitalier de Kingasani', commune: 'Kimbanseke', lat: -4.41, lng: 15.41, services: 'Urgences' },
  { id: 'bondeko', name: 'Centre Hospitalier Bondeko', commune: 'Limete', lat: -4.345, lng: 15.335, services: 'Médecine interne' },
];

/** Centre approximatif des communes (si la localisation est refusée). */
export const COMMUNES: { name: string; lat: number; lng: number }[] = [
  { name: 'Gombe', lat: -4.305, lng: 15.305 },
  { name: 'Kinshasa', lat: -4.322, lng: 15.312 },
  { name: 'Barumbu', lat: -4.317, lng: 15.327 },
  { name: 'Lingwala', lat: -4.325, lng: 15.298 },
  { name: 'Kasa-Vubu', lat: -4.338, lng: 15.302 },
  { name: 'Kalamu', lat: -4.345, lng: 15.315 },
  { name: 'Bandalungwa', lat: -4.342, lng: 15.282 },
  { name: 'Ngaliema', lat: -4.345, lng: 15.25 },
  { name: 'Limete', lat: -4.36, lng: 15.345 },
  { name: 'Lemba', lat: -4.395, lng: 15.32 },
  { name: 'Matete', lat: -4.385, lng: 15.345 },
  { name: 'Ngaba', lat: -4.385, lng: 15.31 },
  { name: 'Masina', lat: -4.385, lng: 15.4 },
  { name: 'Ndjili', lat: -4.395, lng: 15.37 },
  { name: 'Kimbanseke', lat: -4.43, lng: 15.4 },
  { name: 'Mont-Ngafula', lat: -4.45, lng: 15.27 },
  { name: 'Selembao', lat: -4.38, lng: 15.28 },
  { name: 'Makala', lat: -4.37, lng: 15.3 },
];

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function directionsUrl(h: Hospital): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`;
}
