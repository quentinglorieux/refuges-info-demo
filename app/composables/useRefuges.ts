// composables/useRefuges.ts
import { z } from 'zod'

const FeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: z.object({ type: z.string(), coordinates: z.array(z.any()) }).passthrough(),
  properties: z
    .object({
      id: z.number(),
      nom: z.string().optional(),
      // L'API renvoie parfois un objet pour "type" (ex: { id, nom })
      type: z.union([
        z.string(),
        z.number(),
        z.object({ id: z.number().optional(), nom: z.string().optional() }).passthrough()
      ]).optional(),
      altitude: z.number().nullable().optional(),
      icone: z.string().optional()
    })
    .passthrough()
})


const GeoJSONSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(FeatureSchema)
})

export type RefugeFeature = z.infer<typeof FeatureSchema>
export type RefugeGeoJSON = z.infer<typeof GeoJSONSchema>

function buildQuery(params: Record<string, string | number | undefined>) {
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) usp.set(k, String(v))
  }
  return usp.toString()
}

export function useRefugesApi() {
  const config = useRuntimeConfig()
  const base = config.public.apiBase.replace(/\/$/, '')

  async function getBbox(params: {
    bbox: string
    type_points?: string
    nb_points?: number | 'all'
    detail?: 'simple' | 'complet'
    format?: 'geojson'
  }): Promise<RefugeGeoJSON> {
    const qs = buildQuery({ format: 'geojson', detail: 'simple', ...params })
    const url = `${base}/bbox?${qs}`
    const data = await $fetch(url)
    // If we proxied, we may already have JSON; otherwise validate
    return GeoJSONSchema.parse(data)
  }

  async function getPoint(params: { id: number; format?: 'geojson'; detail?: 'complet' }) {
    const qs = buildQuery({ format: 'geojson', detail: 'complet', ...params })
    const url = `${base}/point?${qs}`
    return await $fetch(url)
  }

  async function getContributions(params: { massif?: string; nombre?: number; type?: string } = {}) {
    const qs = buildQuery({ format: 'json', ...params })
    const url = `${base}/contributions?${qs}`
    return await $fetch(url)
  }

  async function getPolygones(params: { massif?: string; type_polygon?: string; type_geom?: 'polygones' | 'polylines' } = {}) {
    const qs = buildQuery({ format: 'geojson', ...params })
    const url = `${base}/polygones?${qs}`
    return await $fetch(url)
  }

  return { getBbox, getPoint, getContributions, getPolygones }
}