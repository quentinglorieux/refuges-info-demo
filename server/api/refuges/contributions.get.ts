import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const url = 'https://www.refuges.info/api/contributions?'
  const res = await $fetch.raw(url + new URLSearchParams(q as Record<string, string>).toString())
  return res._data
})