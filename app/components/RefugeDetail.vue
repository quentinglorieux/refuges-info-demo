<script setup lang="ts">
import { computed } from 'vue'
import type { RefugeFeature } from '~/composables/useRefuges'
import { baseTypeFromFeature, colorForType } from '~/composables/useTypes'

const props = defineProps<{
  feature: RefugeFeature | null
}>()

const emit = defineEmits<{ (e:'close'): void, (e:'open', id:number): void }>()

const p = computed(() => (props.feature as any)?.properties ?? null)

const view = computed(() => {
  const pr: any = p.value
  if (!pr) return null

  const typeObj: any = pr.type
  const typeLabel =
    typeof typeObj === 'object'
      ? (typeObj.nom ?? typeObj.valeur ?? typeObj.icone ?? '—')
      : (typeObj ?? '—')

  const ic: any = pr.info_comp ?? {}
  const boolish = (v: any) =>
    v === 1 || v === '1' || v === true || v === 'Oui' || v === 'oui'

  const lat = Number(pr?.coord?.lat ?? pr?.lat ?? NaN)
  const lon = Number(pr?.coord?.long ?? pr?.lon ?? NaN)

  return {
    id: pr.id ?? null,
    nom: pr.nom ?? 'Sans nom',
    typeLabel,
    color: colorForType(baseTypeFromFeature(props.feature as any)),
    alt: pr?.coord?.alt ?? pr?.altitude ?? null,
    etat: pr?.etat?.valeur || null,
    places: pr?.places?.valeur ?? null,
    remarque: pr?.remarque?.valeur || null,
    acces: pr?.acces?.valeur || null,
    coords: {
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null
    },
    equip: {
      cheminee: boolish(ic?.cheminee?.valeur),
      poele: boolish(ic?.poele?.valeur),
      couvertures: boolish(ic?.couvertures?.valeur),
      latrines: boolish(ic?.latrines?.valeur),
      bois: boolish(ic?.bois?.valeur),
      eau: boolish(ic?.eau?.valeur) || /eau/i.test(String(typeLabel))
    }
  }
})
</script>

<template>
  <transition name="fade">
    <div v-if="feature && view" class="border-t border-gray-200 bg-white/95 backdrop-blur p-4">
      <div class="max-w-5xl mx-auto flex items-start justify-between gap-4">
        <div class="space-y-2">
          <div class="text-lg font-semibold">{{ view.nom }}</div>

          <div class="text-sm text-gray-700 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span class="inline-flex items-center gap-2">
              <span class="inline-block w-3 h-3 rounded-full" :style="`background:${view.color}`" />
              {{ view.typeLabel }}
            </span>
            <span v-if="view.etat">• {{ view.etat }}</span>
            <span v-if="view.alt">• Alt. {{ view.alt }} m</span>
            <span v-if="view.coords.lat !== null && view.coords.lon !== null">
              • {{ view.coords.lat.toFixed(5) }}, {{ view.coords.lon.toFixed(5) }}
            </span>
            <span v-if="view.places !== null">• Places: {{ view.places }}</span>
          </div>

          <div class="flex flex-wrap gap-2 text-xs">
            <span v-if="view.equip.poele" class="px-2 py-0.5 rounded bg-gray-100 border">Poêle</span>
            <span v-if="view.equip.cheminee" class="px-2 py-0.5 rounded bg-gray-100 border">Cheminée</span>
            <span v-if="view.equip.couvertures" class="px-2 py-0.5 rounded bg-gray-100 border">Couvertures</span>
            <span v-if="view.equip.latrines" class="px-2 py-0.5 rounded bg-gray-100 border">Latrines</span>
            <span v-if="view.equip.bois" class="px-2 py-0.5 rounded bg-gray-100 border">Bois à proximité</span>
            <span v-if="view.equip.eau" class="px-2 py-0.5 rounded bg-gray-100 border">Eau à proximité</span>
          </div>

          <div v-if="view.remarque" class="text-sm text-gray-800">
            <span class="font-semibold">Remarque :</span>
            <span>{{ view.remarque }}</span>
          </div>
          <div v-if="view.acces" class="text-sm text-gray-800">
            <span class="font-semibold">Accès :</span>
            <span>{{ view.acces }}</span>
          </div>

          <div class="flex items-center gap-2 pt-1">
            <NuxtLink
              v-if="view.id"
              :to="`/point/${view.id}`"
              class="px-3 py-1.5 rounded bg-gray-900 text-white text-sm"
              @click.prevent="$emit('open', view.id!)"
            >
              Ouvrir la fiche
            </NuxtLink>

            <button
              v-if="view.coords.lat !== null && view.coords.lon !== null"
              class="px-3 py-1.5 rounded border text-sm"
              @click="navigator.clipboard?.writeText(`${view.coords.lat},${view.coords.lon}`)"
            >
              Copier coordonnées
            </button>

            <button class="px-3 py-1.5 rounded border text-sm" @click="$emit('close')">
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>