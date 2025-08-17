import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const url = 'https://www.refuges.info/api/bbox?'
  const res = await $fetch.raw(url + new URLSearchParams(q as Record<string, string>).toString())
  // Pass-through JSON
  return res._data
})
