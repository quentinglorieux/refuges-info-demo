<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import type { RefugeFeature, RefugeGeoJSON } from '~/composables/useRefuges'

const props = defineProps<{ initialCenter?: [number, number]; initialZoom?: number }>()
const emit = defineEmits<{ (e: 'boundsChanged', bbox: string): void; (e: 'markerClick', f: RefugeFeature): void }>()

let map: any
let markersLayer: any
let Lmod: any

onMounted(async () => {
  // ⬇️ Import Leaflet uniquement côté client pour éviter "window is not defined"
  const L = await import('leaflet')
  Lmod = L
  map = L.map('map', { attributionControl: true }).setView(props.initialCenter || [45.5, 6.5], props.initialZoom || 9)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map)
  markersLayer = L.layerGroup().addTo(map)

  const debounced = useDebounceFn(() => {
    const b = map.getBounds()
    const bbox = `${b.getWest().toFixed(4)},${b.getSouth().toFixed(4)},${b.getEast().toFixed(4)},${b.getNorth().toFixed(4)}`
    emit('boundsChanged', bbox)
  }, 500)

  map.on('moveend', debounced)
  debounced()
})

function renderFeatures(fc: RefugeGeoJSON) {
  if (!markersLayer) return
  markersLayer.clearLayers()
  fc.features.forEach((f) => {
    const [lon, lat] = (f.geometry as any).coordinates
    // import dynamique déjà fait ; on réutilise l'instance globale
    // @ts-expect-error leaflet global
    if (!Lmod) return
    const m = Lmod.marker([lat, lon])
    m.on('click', () => emit('markerClick', f))
    const alt = f.properties.altitude ? `${f.properties.altitude} m` : '—'
    m.bindPopup(`<strong>${f.properties.nom ?? 'Sans nom'}</strong><br/>Alt: ${alt}`)
    m.addTo(markersLayer)
  })
}

// expose method to parent
// @ts-expect-error expose
defineExpose({ renderFeatures })
</script>

<template>
  <div id="map" class="w-full h-[70vh] rounded-xl overflow-hidden shadow" />
</template>

<style scoped>
#map { height: 70vh; }
</style>