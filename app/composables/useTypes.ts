// composables/useTypes.ts
import { ref, watch } from 'vue'

// Mapping stable des IDs connus de l’API refuges.info → libellés type_points
const TYPE_BY_ID: Record<number, string> = {
  7:  'cabane',
  10: 'refuge',
  9:  'gite',
  23: 'pt_eau',
  6:  'sommet',
  3:  'pt_passage',
  19: 'bivouac',
  16: 'lac'
} as const

// --- Helpers couleur --- //
function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0
  }
  return Math.abs(h)
}

const COLOR_BY_TYPE: Record<string, string> = {
  cabane: '#f53c3cff',     // orange
  refuge: '#adb41fff',    // bleu
  gite: '#a0362cff',      // vert
  bivouac: '#27d630ff',   // rouge
  pt_eau: '#17becf',    // turquoise
  pt_passage: '#9467bd',// violet
  sommet: '#8c564b',    // marron
  lac: '#101213ff',       // bleu foncé
  autre: '#7f7f7f'      // gris
}

export function colorForType(t: string): string {
  return COLOR_BY_TYPE[t] || '#000000' // noir par défaut
}

// --- Normalisation d’un feature vers son type_points --- //
export function baseTypeFromFeature(f: any): string {
  const t = f?.properties?.type

  // 1) type is a number id (detail=simple can return this)
  if (typeof t === 'number') {
    const hit = TYPE_BY_ID[t as number]
    return hit ?? 'autre'
  }

  // 2) type is an object with id (detail=complet)
  const id: unknown = t?.id
  if (typeof id === 'number' && TYPE_BY_ID[id]) {
    return TYPE_BY_ID[id]
  }

  // 3) type is a string label (detail=simple can return this)
  const label = (typeof t === 'string' ? t : (t?.valeur ?? '')).toLowerCase()
  if (label.startsWith('cabane')) return 'cabane'
  if (label.startsWith('refuge')) return 'refuge'
  if (label.includes('gîte') || label.includes('gite')) return 'gite'
  if (label.startsWith('bivouac')) return 'bivouac'
  if (label.startsWith('sommet')) return 'sommet'
  if (label.includes('eau')) return 'pt_eau'
  if (label.includes('col') || label.includes('passage')) return 'pt_passage'
  if (label.startsWith('lac')) return 'lac'

  return 'autre'
}

// --- État réactif partagé --- //
export const observedTypes = ref<string[]>([])
export const selectedTypes = ref<string[]>([])
export const ALL_TYPES: string[] = Array.from(new Set(Object.values(TYPE_BY_ID))).sort()

/**
 * Surveille une FeatureCollection et met à jour la liste des types observés
 * @param fc ref() contenant la FeatureCollection
 */
export function useTypes(fc: any) {
  watch(fc, () => {
    const set = new Set<string>()
    for (const feat of fc.value?.features ?? []) {
      set.add(baseTypeFromFeature(feat))
    }
    observedTypes.value = Array.from(set).sort()

    // Initialiser sélection si vide
    if (selectedTypes.value.length === 0) {
      selectedTypes.value = [...observedTypes.value]
    }
  })

  function colorFor(f: any): string {
    return colorForType(baseTypeFromFeature(f))
  }

  return {
    observedTypes,
    selectedTypes,
    baseTypeFromFeature,
    colorFor,
    colorForType
  }
}