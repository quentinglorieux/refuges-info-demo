<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'

// Types facultatifs pour confort
type LngLat = [number, number]
type Feature = {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties?: Record<string, any>
}

const props = defineProps<{
  features?: Feature[]          // ← on vous passe la liste filtrée depuis la page
  initialCenter?: LngLat        // ex: [45.5, 6.5]
  initialZoom?: number          // ex: 9
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
let lastBboxKey = '' // pour n’émettre que si ça change vraiment

// ————— utils —————
function quantize(n: number, decimals = 3) {
  return Number(n.toFixed(decimals)) // ~110 m pour 3 décimales
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
}, 700) // ajustez si besoin

// ————— lifecycle —————
onMounted(async () => {
  // Import Leaflet en client-only
  const L = await import('leaflet')
  Lmod = L

  // Installez le CSS dans nuxt.config.ts (css: ['leaflet/dist/leaflet.css'])
  map = Lmod.map('map', { attributionControl: true })
    .setView(props.initialCenter || [45.5, 6.5], props.initialZoom || 9)

  Lmod.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map)

  // Canvas renderer = plus fluide que SVG quand il y a beaucoup de points
  canvasRenderer = Lmod.canvas({ padding: 0.4 })
  markersLayer = Lmod.layerGroup().addTo(map)

  map.on('moveend', emitBounds)
  emitBounds() // première émission

  // premier rendu si des features sont déjà passées
  renderFeatures(props.features || [])
})

onBeforeUnmount(() => {
  if (map) {
    map.off()
    map.remove()
  }
})

// ————— rendu markers —————
function renderFeatures(features: Feature[]) {
  if (!markersLayer || !Lmod) return
  markersLayer.clearLayers()

  for (const f of features) {
    const [lon, lat] = f.geometry.coordinates
    // couleur via prop; défaut si absent
    const color = props.getColor ? props.getColor(f) : '#2563eb'

    const m = Lmod.circleMarker([lat, lon], {
      radius: 5,
      weight: 1,
      color,
      fillColor: color,
      fillOpacity: 0.9,
      renderer: canvasRenderer
    })

    // Popup simple (optionnel — Leaflet reste pratique pour dépanner)
    const p: any = f.properties || {}
    const alt = p?.coord?.alt ?? p?.altitude ?? null
    const typeLabel = typeof p?.type === 'object'
      ? (p?.type?.nom ?? p?.type?.valeur ?? p?.type?.icone ?? '—')
      : (p?.type ?? '—')
    const nom = p?.nom ?? 'Sans nom'
    m.bindPopup(`<strong>${nom}</strong><br/>Type: ${typeLabel}${alt ? `<br/>Alt: ${alt} m` : ''}`)

    m.on('click', () => emit('markerClick', f))
    m.addTo(markersLayer)
  }
}

// Redessiner quand la prop features change
watch(
  () => props.features,
  (val) => renderFeatures(val || []),
  { deep: true }
)
</script>

<template>
  <!-- Le conteneur Leaflet -->
  <div id="map" class="w-full h-[70vh] rounded-xl overflow-hidden shadow" />
</template>

<style scoped>
#map { height: 70vh; }
</style>