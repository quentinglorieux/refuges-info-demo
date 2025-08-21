<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import MapClientOnly from '~/components/MapClientOnly.vue'
import type { RefugeGeoJSON, RefugeFeature } from '~/composables/useRefuges'
import { baseTypeFromFeature, colorForType, ALL_TYPES } from '~/composables/useTypes'

const { getBbox } = useRefugesApi()

// ---------------- State ----------------
const bbox = ref<string>('')                     // BBOX quantisée émise par la carte
const loading = ref(false)
const error = ref<string | null>(null)
const fc = ref<RefugeGeoJSON | null>(null)
const mapRef = ref<InstanceType<typeof MapClientOnly> | null>(null)

// Menu : toutes les catégories connues ; sélection initiale = cabane
const allTypes = ALL_TYPES
const selectedTypes = ref<string[]>(['cabane'])

// Feature sélectionnée (panneau bas)
const sel = ref<RefugeFeature | null>(null)

// Couleur d’un point
function colorFor(f: RefugeFeature): string {
  return colorForType(baseTypeFromFeature(f))
}

// ---------------- Cache & requêtes ----------------
const cache = new Map<string, RefugeGeoJSON>()
let abortCtrl: AbortController | null = null

function bboxKeyForFetch(b: string) {
  // Quantisation (réduit les appels pendant les déplacements)
  const [w, s, e, n] = b.split(',').map(Number)
  const q = (x: number) => Number(x.toFixed(3)) // ~110 m
  return `${q(w)},${q(s)},${q(e)},${q(n)}`
}

async function load() {
  if (!bbox.value) return

  const key = bboxKeyForFetch(bbox.value)

  // Cache hit
  if (cache.has(key)) {
    fc.value = cache.get(key)!
    renderFiltered()
    return
  }

  // Annule la requête précédente si encore active
  if (abortCtrl) abortCtrl.abort()
  abortCtrl = new AbortController()

  try {
    loading.value = true
    error.value = null

    const data = await getBbox({
      bbox: bbox.value,
      type_points: 'all',   // on récupère tout pour la BBOX
      nb_points: 400,       // ajustez selon vos perfs
      detail: 'simple',     // payload plus léger (le parser gère number|string|object)
      // @ts-expect-error : si votre wrapper supporte signal
      signal: abortCtrl.signal
    })

    cache.set(key, data)
    fc.value = data
    renderFiltered()
  } catch (e: any) {
    if (e?.name !== 'AbortError') error.value = e?.message || 'Erreur inconnue'
  } finally {
    loading.value = false
  }
}

// Filtre local + rendu carte
function renderFiltered() {
  if (!fc.value) return
  const features = (fc.value.features ?? []).filter((feat: any) =>
    selectedTypes.value.length === 0 || selectedTypes.value.includes(baseTypeFromFeature(feat))
  )

  // Si la feature sélectionnée n’est plus visible, on ferme le panneau
  if (sel.value && !features.includes(sel.value)) {
    sel.value = null
  }

  const filtered: RefugeGeoJSON = { ...(fc.value as any), features }
  mapRef.value?.renderFeatures(filtered)
}

// Changement de sélection -> re-rendu local (pas d’API)
watch(selectedTypes, () => {
  renderFiltered()
})

// Carte -> nouvelle BBOX -> (re)load
function onBoundsChanged(b: string) {
  bbox.value = b
  load()
}

// Clic marqueur -> ouvre panneau bas (pas de navigation)
function onMarkerClick(f: RefugeFeature) {
  sel.value = f
}

// Helpers pour panneau d’infos
const selProps = computed(() => {
  const p: any = sel.value?.properties ?? null
  if (!p) return null

  const typeObj: any = p.type
  const typeLabel =
    typeof typeObj === 'object'
      ? (typeObj.nom ?? typeObj.valeur ?? typeObj.icone ?? '—')
      : (typeObj ?? '—')

  // équipements / infos complémentaires
  const ic: any = p.info_comp ?? {}
  const boolish = (v: any) => v === 1 || v === '1' || v === true || v === 'Oui' || v === 'oui'

  return {
    id: p.id ?? null,
    nom: p.nom ?? 'Sans nom',
    typeLabel,
    alt: p?.coord?.alt ?? p?.altitude ?? null,
    remarque: p?.remarque?.valeur || null,
    acces: p?.acces?.valeur || null,
    etat: p?.etat?.valeur || null,
    places: p?.places?.valeur ?? null,       // parfois null / 0 / nombre
    coords: {
      lat: Number(p?.coord?.lat ?? p?.lat ?? NaN),
      lon: Number(p?.coord?.long ?? p?.lon ?? NaN)
    },
    // synthèse “équipements”
    equip: {
      cheminee: boolish(ic?.cheminee?.valeur),
      poele:    boolish(ic?.poele?.valeur),
      couvertures: boolish(ic?.couvertures?.valeur),
      latrines: boolish(ic?.latrines?.valeur),
      bois:     boolish(ic?.bois?.valeur),
      eau:      boolish(ic?.eau?.valeur) || /eau/i.test(String(p?.type?.valeur ?? ''))
    }
  }
})
</script>

<template>
  <div class="flex flex-col min-h-[85vh]">
    <div class="flex flex-1">
      <!-- Sidebar -->
      <aside class="w-72 p-4 border-r border-gray-200 space-y-4">
        <h2 class="text-lg font-semibold">Types de points.           <span v-if="loading"> Chargement…</span>
</h2>

        <div class="space-y-2">
          <label
            v-for="t in allTypes"
            :key="t"
            class="flex items-center gap-2 cursor-pointer"
          >
            <input
              type="checkbox"
              class="accent-gray-700"
              :value="t"
              v-model="selectedTypes"
            />
            <span class="inline-flex items-center gap-2">
              <span class="inline-block w-3 h-3 rounded-full" :style="`background:${colorForType(t)}`" />
              {{ t }}
            </span>
          </label>
        </div>

        <div class="text-xs text-gray-600 pt-4 border-t space-y-1">
          <div><strong>BBOX</strong> : {{ bbox || '—' }}</div>
          <div><strong>Points (cache)</strong> : {{ fc?.features?.length ?? 0 }}</div>
          <p v-if="error" class="text-red-600">{{ error }}</p>
        </div>
      </aside>

      <!-- Map -->
      <main class="flex-1 p-4 space-y-3">
        <h1 class="text-2xl font-semibold">Refuges.info – Démo Nuxt</h1>

        <ClientOnly>
          <MapClientOnly
            ref="mapRef"
            :getColor="colorFor"
            @boundsChanged="onBoundsChanged"
            @markerClick="onMarkerClick"
          />
        </ClientOnly>
      </main>
    </div>

<!-- Panneau d’infos bas -->
<transition name="fade">
  <div v-if="sel && selProps" class="border-t border-gray-200 bg-white/95 backdrop-blur p-4">
    <div class="max-w-5xl mx-auto flex items-start justify-between gap-4">
      <div class="space-y-2">
        <!-- Titre + méta -->
        <div class="text-lg font-semibold">{{ selProps.nom }}</div>
        <div class="text-sm text-gray-700 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span class="inline-flex items-center gap-2">
            <span class="inline-block w-3 h-3 rounded-full" :style="`background:${colorFor(sel as any)}`" />
            {{ selProps.typeLabel }}
          </span>
          <span v-if="selProps.etat">• {{ selProps.etat }}</span>
          <span v-if="selProps.alt">• Alt. {{ selProps.alt }} m</span>
          <span v-if="Number.isFinite(selProps.coords.lat) && Number.isFinite(selProps.coords.lon)">
            • {{ selProps.coords.lat.toFixed(5) }}, {{ selProps.coords.lon.toFixed(5) }}
          </span>
          <span v-if="selProps.places !== null">• Places: {{ selProps.places }}</span>
        </div>

        <!-- Équipements sous forme de “chips” -->
        <div class="flex flex-wrap gap-2 text-xs">
          <span v-if="selProps.equip.poele" class="px-2 py-0.5 rounded bg-gray-100 border">Poêle</span>
          <span v-if="selProps.equip.cheminee" class="px-2 py-0.5 rounded bg-gray-100 border">Cheminée</span>
          <span v-if="selProps.equip.couvertures" class="px-2 py-0.5 rounded bg-gray-100 border">Couvertures</span>
          <span v-if="selProps.equip.latrines" class="px-2 py-0.5 rounded bg-gray-100 border">Latrines</span>
          <span v-if="selProps.equip.bois" class="px-2 py-0.5 rounded bg-gray-100 border">Bois à proximité</span>
          <span v-if="selProps.equip.eau" class="px-2 py-0.5 rounded bg-gray-100 border">Eau à proximité</span>
        </div>

        <!-- Remarque / Accès -->
        <div v-if="selProps.remarque" class="text-sm text-gray-800">
          <span class="font-semibold">Remarque :</span>
          <span>{{ selProps.remarque }}</span>
        </div>
        <div v-if="selProps.acces" class="text-sm text-gray-800">
          <span class="font-semibold">Accès :</span>
          <span>{{ selProps.acces }}</span>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 pt-1">
          <NuxtLink
            v-if="selProps.id"
            :to="`/point/${selProps.id}`"
            class="px-3 py-1.5 rounded bg-gray-900 text-white text-sm"
          >
            Ouvrir la fiche
          </NuxtLink>

          <button
            v-if="Number.isFinite(selProps.coords.lat) && Number.isFinite(selProps.coords.lon)"
            class="px-3 py-1.5 rounded border text-sm"
            @click="navigator.clipboard?.writeText(`${selProps.coords.lat},${selProps.coords.lon}`)"
          >
            Copier coordonnées
          </button>

          <button
            class="px-3 py-1.5 rounded border text-sm"
            @click="sel = null"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  </div>
</transition>


  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>