<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import type { RefugeFeature, RefugeGeoJSON } from '~/composables/useRefuges'

const props = defineProps<{
  initialCenter?: [number, number]
  initialZoom?: number
  getColor?: (f: RefugeFeature) => string
}>()

const emit = defineEmits<{
  (e: 'boundsChanged', bbox: string): void
  (e: 'markerClick', f: RefugeFeature): void
}>()

let map: any
let markersLayer: any
let Lmod: any

onMounted(async () => {
  const L = await import('leaflet')
  Lmod = L

  map = Lmod.map('map', { attributionControl: true })
    .setView(props.initialCenter || [45.5, 6.5], props.initialZoom || 9)

  Lmod.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map)

  markersLayer = Lmod.layerGroup().addTo(map)

  const debounced = useDebounceFn(() => {
    const b = map.getBounds()
    const bbox = `${b.getWest().toFixed(4)},${b.getSouth().toFixed(4)},${b.getEast().toFixed(4)},${b.getNorth().toFixed(4)}`
    emit('boundsChanged', bbox)
  }, 400)

  map.on('moveend', debounced)
  debounced()
})

function renderFeatures(fc: RefugeGeoJSON) {
  if (!markersLayer || !Lmod) return
  markersLayer.clearLayers()

  fc.features.forEach((f) => {
    const [lon, lat] = (f.geometry as any).coordinates
    const color = props.getColor ? props.getColor(f) : '#2563eb'
    const m = Lmod.circleMarker([lat, lon], {
      radius: 6, weight: 1, color, fillColor: color, fillOpacity: 0.9
    })
    m.on('click', () => emit('markerClick', f))

    const p: any = f.properties ?? {}
    const alt = p.altitude ? `${p.altitude} m` : '—'
    const nom = p.nom ?? 'Sans nom'
    const typeObj: any = p.type
    const typeLabel = typeof typeObj === 'object'
      ? (typeObj.nom ?? typeObj.valeur ?? typeObj.icone ?? '—')
      : (typeObj ?? '—')

    m.bindPopup(`<strong>${nom}</strong><br/>Type: ${typeLabel}<br/>Alt: ${alt}`)
    m.addTo(markersLayer)
  })
}

// expose
// @ts-expect-error expose
defineExpose({ renderFeatures })
</script>

<template>
  <div id="map" class="w-full h-[70vh] rounded-xl overflow-hidden shadow" />
</template>

<style scoped>
#map { height: 70vh; }
</style>