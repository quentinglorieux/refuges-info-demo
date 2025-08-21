// composables/useRefugesMap.ts
import { ref, computed } from 'vue'
import type { RefugeGeoJSON, RefugeFeature } from '~/composables/useRefuges'
import { baseTypeFromFeature, colorForType, ALL_TYPES } from '~/composables/useTypes'

export function useRefugesMap() {
  const { getBbox } = useRefugesApi()

  // état principal
  const bbox = ref<string>('')
  const loading = ref(false)
  const error = ref<string | null>(null)
  const fc = ref<RefugeGeoJSON | null>(null)

  // sélection types (menu)
  const allTypes = ALL_TYPES
  const selectedTypes = ref<string[]>(['cabane']) // démarrage = cabane

  // feature sélectionnée (panneau bas)
  const sel = ref<RefugeFeature | null>(null)

  // couleur d’un point
  function colorFor(f: RefugeFeature): string {
    return colorForType(baseTypeFromFeature(f))
  }

  // cache & annulation
  const cache = new Map<string, RefugeGeoJSON>()
  let abortCtrl: AbortController | null = null

  function bboxKeyForFetch(b: string) {
    const [w,s,e,n] = b.split(',').map(Number)
    const q = (x:number) => Number(x.toFixed(3)) // ~110 m
    return `${q(w)},${q(s)},${q(e)},${q(n)}`
  }

  async function load() {
    if (!bbox.value) return
    const key = bboxKeyForFetch(bbox.value)

    if (cache.has(key)) {
      fc.value = cache.get(key)!
      return
    }

    if (abortCtrl) abortCtrl.abort()
    abortCtrl = new AbortController()

    try {
      loading.value = true
      error.value = null

      const data = await getBbox({
        bbox: bbox.value,
        type_points: 'all', // on récupère tout (filtre local)
        nb_points: 400,
        detail: 'simple',
        // @ts-expect-error selon wrapper
        signal: abortCtrl.signal
      })

      cache.set(key, data)
      fc.value = data
    } catch (e:any) {
      if (e?.name !== 'AbortError') error.value = e?.message || 'Erreur inconnue'
    } finally {
      loading.value = false
    }
  }

  // filtre local
  const filtered = computed<RefugeGeoJSON | null>(() => {
    if (!fc.value) return null
    const feats = (fc.value.features ?? []).filter(
      (f:any) => selectedTypes.value.includes(baseTypeFromFeature(f))
    )
    // ferme le panneau si l’élément n’est plus dans la vue filtrée
    if (sel.value && !feats.includes(sel.value)) sel.value = null
    return { ...(fc.value as any), features: feats }
  })

  function onBoundsChanged(newBbox: string) {
    bbox.value = newBbox
    load()
  }

  function onMarkerClick(f: RefugeFeature) {
    sel.value = f
  }

  return {
    // état
    bbox, loading, error, fc, filtered,
    // sélection
    allTypes, selectedTypes,
    // interactions carte
    onBoundsChanged, onMarkerClick,
    // détail sélectionné
    sel,
    // helpers
    colorFor
  }
}