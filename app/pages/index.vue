<script setup lang="ts">
import MapClientOnly from '~/components/MapClientOnly.vue'
import type { RefugeGeoJSON, RefugeFeature } from '~/composables/useRefuges'

const { getBbox } = useRefugesApi()
const bbox = ref<string>('')
const loading = ref(false)
const error = ref<string | null>(null)
const fc = ref<RefugeGeoJSON | null>(null)
const mapRef = ref<InstanceType<typeof MapClientOnly> | null>(null)

async function load() {
  if (!bbox.value) return
  try {
    loading.value = true
    error.value = null
    const data = await getBbox({ bbox: bbox.value, type_points: 'all', nb_points: 250, detail: 'simple' })
    fc.value = data
    mapRef.value?.renderFeatures(data)
  } catch (e: any) {
    error.value = e?.message || 'Erreur inconnue'
  } finally {
    loading.value = false
  }
}

function onBoundsChanged(b: string) {
  bbox.value = b
  load()
}

function onMarkerClick(f: RefugeFeature) {
  navigateTo(`/point/${f.properties.id}`)
}
</script>

<template>
  <div class="p-6 space-y-4">
    <h1 class="text-2xl font-semibold">Refuges.info – Démo Nuxt</h1>
    <p class="text-sm text-gray-600">BBOX: {{ bbox || '—' }}</p>
    <MapClientOnly ref="mapRef" @boundsChanged="onBoundsChanged" @markerClick="onMarkerClick" />
    <div v-if="loading">Chargement…</div>
    <div v-if="error" class="text-red-600">{{ error }}</div>
    <div v-if="fc" class="text-sm text-gray-700">{{ fc.features.length }} point(s)</div>
  </div>
</template>