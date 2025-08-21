<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'

// Types légers
type LngLat = [number, number]
type Feature = {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties?: Record<string, any>
}

const props = defineProps<{
  features?: Feature[]
  initialCenter?: LngLat
  initialZoom?: number
  getColor?: (f: Feature) => string
}>()

const emit = defineEmits<{
  (e: 'boundsChanged', bbox: string): void
  (e: 'markerClick', f: Feature): void
}>()

let map: any
let Lmod: any
let markersLayer: any
let canvasRenderer: any
let lastBboxKey = ''

function quantize(n: number, decimals = 3) {
  return Number(n.toFixed(decimals)) // ~110 m
}
function bboxKeyFromMap() {
  const b = map.getBounds()
  return `${quantize(b.getWest())},${quantize(b.getSouth())},${quantize(b.getEast())},${quantize(b.getNorth())}`
}
const emitBounds = useDebounceFn(() => {
  if (!map) return
  const key = bboxKeyFromMap()
  if (key === lastBboxKey) return
  lastBboxKey = key
  emit('boundsChanged', key)
}, 700)

onMounted(async () => {
  const L = await import('leaflet')
  Lmod = L

  map = Lmod.map('map', { attributionControl: true })
    .setView(props.initialCenter || [45.5, 6.5], props.initialZoom || 9)

  Lmod.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map)

  canvasRenderer = Lmod.canvas({ padding: 0.4 })
  markersLayer = Lmod.layerGroup().addTo(map)

  map.on('moveend', emitBounds)
  emitBounds()

  renderFeatures(props.features || [])
})

onBeforeUnmount(() => {
  if (map) {
    map.off()
    map.remove()
  }
})

// ---------- rendu ----------
function renderFeatures(features: Feature[]) {
  if (!markersLayer || !Lmod) return
  markersLayer.clearLayers()

  for (const f of features) {
    const [lon, lat] = f.geometry.coordinates
    const color = props.getColor ? props.getColor(f) : '#2563eb'

    const marker = Lmod.circleMarker([lat, lon], {
      radius: 5,
      weight: 1,
      color,
      fillColor: color,
      fillOpacity: 0.9,
      renderer: canvasRenderer,
      bubblingMouseEvents: false
    })

    // --- Infos pour tooltip ---
    const p: any = f.properties || {}
    const nom = p?.nom ?? 'Sans nom'
    const typeLabel = typeof p?.type === 'object'
      ? (p?.type?.nom ?? p?.type?.valeur ?? p?.type?.icone ?? '—')
      : (p?.type ?? '—')
    const alt = p?.coord?.alt ?? null
    const places = p?.places?.valeur ?? null

    let tooltipHtml = `<strong>${nom}</strong><br/>${typeLabel}`
    if (alt) tooltipHtml += ` · Alt. ${alt} m`
    if (places && Number(places) > 0) tooltipHtml += ` · ${places} places`

    marker.bindTooltip(tooltipHtml, {
      direction: 'top',
      offset: [0, -6],
      sticky: true,
      opacity: 0.95
    })

    // Click => panneau bas
    marker.on('click', () => emit('markerClick', f))

    marker.addTo(markersLayer)
  }
}

watch(
  () => props.features,
  (val) => renderFeatures(val || []),
  { deep: true }
)
</script>

<template>
  <div id="map" class="w-full h-[70vh] rounded-xl overflow-hidden shadow" />
</template>

<style scoped>
#map { height: 70vh; }
</style>