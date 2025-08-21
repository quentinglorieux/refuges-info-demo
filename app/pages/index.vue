<script setup lang="ts">
import MapClientOnly from '~/components/MapClientOnly.vue'
import RefugeDetail from '~/components/RefugeDetail.vue'
import { useRefugesMap } from '~/composables/useRefugesMap'
import { ALL_TYPES, colorForType } from '~/composables/useTypes'

const {
  bbox, loading, error, filtered,
  allTypes, selectedTypes,
  onBoundsChanged, onMarkerClick,
  sel, colorFor
} = useRefugesMap()
</script>

<template>
  <div class="flex flex-col min-h-[85vh]">
    <div class="flex flex-1">
      <!-- Sidebar -->
      <aside class="w-72 p-4 border-r border-gray-200 space-y-4">
        <h2 class="text-lg font-semibold">Types de points</h2>
        <div class="space-y-2">
          <label
            v-for="t in ALL_TYPES"
            :key="t"
            class="flex items-center gap-2 cursor-pointer"
          >
            <input type="checkbox" class="accent-gray-700" :value="t" v-model="selectedTypes" />
            <span class="inline-flex items-center gap-2">
              <span class="inline-block w-3 h-3 rounded-full" :style="`background:${colorForType(t)}`" />
              {{ t }}
            </span>
          </label>
        </div>

        <div class="text-xs text-gray-600 pt-4 border-t space-y-1">
          <div><strong>BBOX</strong> : {{ bbox || '—' }}</div>
          <p v-if="loading">Chargement…</p>
          <p v-if="error" class="text-red-600">{{ error }}</p>
        </div>
      </aside>

      <!-- Carte -->
      <main class="flex-1 p-4 space-y-3">
        <h1 class="text-2xl font-semibold">Refuges.info – Démo Nuxt</h1>

        <ClientOnly>
          <MapClientOnly
            :features="filtered?.features ?? []"
            :getColor="colorFor"
            @boundsChanged="onBoundsChanged"
            @markerClick="onMarkerClick"
          />
        </ClientOnly>
      </main>
    </div>

    <!-- Panneau bas -->
    <RefugeDetail
      :feature="sel"
      @close="sel = null"
      @open="(id:number) => navigateTo(`/point/${id}`)"
    />
  </div>
</template>