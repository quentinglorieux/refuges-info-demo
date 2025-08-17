<script setup lang="ts">
const route = useRoute()
const id = Number(route.params.id)
const { getPoint } = useRefugesApi()
const data = await getPoint({ id, detail: 'complet' })
</script>

<template>
  <div class="p-6 space-y-4">
    <NuxtLink to="/" class="text-blue-600">← Retour</NuxtLink>
    <h1 class="text-2xl font-semibold">{{ data?.features?.[0]?.properties?.nom || 'Point ' + $route.params.id }}</h1>
    <pre class="bg-gray-100 p-4 rounded overflow-x-auto text-xs">{{ JSON.stringify(data, null, 2) }}</pre>
  </div>
</template>