// Cascading region data: Province → City → District
import type { RegionData } from './types';
export type { RegionData } from './types';

import { sumatera } from './sumatera';
import { jawa } from './jawa';
import { baliNusa } from './bali-nusa';
import { kalimantan } from './kalimantan';
import { sulawesi } from './sulawesi';
import { malukuPapua } from './maluku-papua';

export const indonesiaRegions: RegionData = {
  ...sumatera,
  ...jawa,
  ...baliNusa,
  ...kalimantan,
  ...sulawesi,
  ...malukuPapua,
};

export function getProvinces(): string[] {
  return Object.keys(indonesiaRegions).sort();
}

export function getCities(province: string): string[] {
  return Object.keys(indonesiaRegions[province] || {}).sort();
}

export function getDistricts(province: string, city: string): string[] {
  return (indonesiaRegions[province]?.[city] || []).sort();
}
