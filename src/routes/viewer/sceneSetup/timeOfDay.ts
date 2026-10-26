import * as THREE from 'three';

export const SUNRISE_HOUR = 8;
export const SUNSET_HOUR = 20;

const MIN_ELEVATION_DEG = 8;
const MAX_ELEVATION_DEG = 60;

export const SUN_COLOR_NOON = new THREE.Color(0.99, 0.83, 0.62);
const SUN_COLOR_EVENING = new THREE.Color(1.0, 0.4, 0.05);
// The sunlight starts turning orange at 18:00 (springtime at mid-latitudes).
const ORANGE_START_HOUR = 18;
const ORANGE_START = (ORANGE_START_HOUR - SUNRISE_HOUR) / (SUNSET_HOUR - SUNRISE_HOUR);

// Strength of the direct sunlight on the clouds: strongest at noon, weaker for a low sun.
const SOLAR_FACTOR_NOON = 1.2;
const SOLAR_FACTOR_LOW_SUN = 0.75;

const AMBIENT_TOP_MORNING = new THREE.Color(0.55, 0.6, 0.65);
const AMBIENT_TOP_EVENING = new THREE.Color(0.55, 0.4, 0.35);
const AMBIENT_BOT_MORNING = new THREE.Color(0.4, 0.4, 0.4);
const AMBIENT_BOT_EVENING = new THREE.Color(0.35, 0.25, 0.2);

const AMBIENT_GROUND_WEIGHT = 0.5;

const SKY_MORNING = new THREE.Color(0.53, 0.81, 0.92);
const SKY_EVENING = new THREE.Color(0.95, 0.5, 0.25);

export interface SunLighting {
  // Azimuth in the box's xy plane from +x (east) and elevation above that plane.
  azimuthDeg: number;
  elevationDeg: number;
  sunColor: THREE.Color;
  ambientTop: THREE.Color;
  ambientBottom: THREE.Color;
  background: THREE.Color;
  // Multiplier for the unlit ground colour: ambient plus direct sunlight reaching the surface.
  groundTint: THREE.Color;
  solarFactor: number;
}

// Sunlight on a horizontal surface scales with the sine of the sun's elevation.
function groundTint(sunColor: THREE.Color, ambientTop: THREE.Color, elevationDeg: number): THREE.Color {
  const sunStrength = 0.35 + 0.65 * Math.sin(THREE.MathUtils.degToRad(elevationDeg)) / Math.sin(THREE.MathUtils.degToRad(MAX_ELEVATION_DEG));
  const tint = sunColor.clone().multiplyScalar(sunStrength).add(ambientTop.clone().multiplyScalar(AMBIENT_GROUND_WEIGHT));
  // Scale so that the brightest (noon) tint stays at about 1, keeping the map at its natural brightness.
  return tint.multiplyScalar(1 / (SUN_COLOR_NOON.r + AMBIENT_TOP_MORNING.r * AMBIENT_GROUND_WEIGHT));
}

// 8 AM: low sun in the east; noon: highest; 8 PM: low sun in the west with an orange glow.
export function sunLightingAt(hour: number): SunLighting {
  const t = THREE.MathUtils.clamp((hour - SUNRISE_HOUR) / (SUNSET_HOUR - SUNRISE_HOUR), 0, 1);
  const orange = THREE.MathUtils.smoothstep(t, ORANGE_START, 1);
  const elevationDeg = MIN_ELEVATION_DEG + (MAX_ELEVATION_DEG - MIN_ELEVATION_DEG) * Math.sin(Math.PI * t);
  const sunColor = SUN_COLOR_NOON.clone().lerp(SUN_COLOR_EVENING, orange);
  const ambientTop = AMBIENT_TOP_MORNING.clone().lerp(AMBIENT_TOP_EVENING, orange);
  return {
    azimuthDeg: 180 * t,
    elevationDeg,
    solarFactor: THREE.MathUtils.lerp(
      SOLAR_FACTOR_LOW_SUN,
      SOLAR_FACTOR_NOON,
      (elevationDeg - MIN_ELEVATION_DEG) / (MAX_ELEVATION_DEG - MIN_ELEVATION_DEG)
    ),
    sunColor,
    ambientTop,
    groundTint: groundTint(sunColor, ambientTop, elevationDeg),
    ambientBottom: AMBIENT_BOT_MORNING.clone().lerp(AMBIENT_BOT_EVENING, orange),
    background: SKY_MORNING.clone().lerp(SKY_EVENING, orange)
  };
}

export function sunDirection(azimuthDeg: number, elevationDeg: number): THREE.Vector3 {
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  const el = THREE.MathUtils.degToRad(elevationDeg);
  return new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el));
}

export function formatHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(m === 60 ? h + 1 : h).padStart(2, '0')}:${String(m === 60 ? 0 : m).padStart(2, '0')}`;
}

// Per-channel factors that turn the noon sun colour into a neutral grey of the same brightness.
export function noonWhiteBalance(): THREE.Vector3 {
  const luma = 0.2126 * SUN_COLOR_NOON.r + 0.7152 * SUN_COLOR_NOON.g + 0.0722 * SUN_COLOR_NOON.b;
  return new THREE.Vector3(luma / SUN_COLOR_NOON.r, luma / SUN_COLOR_NOON.g, luma / SUN_COLOR_NOON.b);
}
