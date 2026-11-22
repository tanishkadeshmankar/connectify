import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const baseUrl = 'https://lgd-json-api.vercel.app/api'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = path.join(root, 'public', 'data', 'india-locations.json')

async function getJson(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`Location source returned HTTP ${response.status} for ${pathname}`)
  const payload = await response.json()
  if (!Array.isArray(payload.data)) throw new Error(`Unexpected location response for ${pathname}`)
  return payload
}

async function getAll(resource) {
  const first = await getJson(`/${resource}?page=1&limit=100`)
  const rows = [...first.data]
  const pages = Number(first.pagination?.pages || 1)
  for (let page = 2; page <= pages; page += 1) {
    const result = await getJson(`/${resource}?page=${page}&limit=100`)
    rows.push(...result.data)
  }
  return rows
}

const [states, districts, cities] = await Promise.all([
  getAll('states'),
  getAll('districts'),
  getAll('cities'),
])

const alphabetize = (left, right) => left.name.localeCompare(right.name, 'en', { sensitivity: 'base' })
states.sort(alphabetize)
districts.sort(alphabetize)
cities.sort(alphabetize)

const compactStates = states.map(({ code, name, type }) => ({ code, name, type }))
const compactDistricts = districts.map(({ code, name, stateCode }) => ({ code, name, stateCode }))
const compactCities = cities.map(({ code, name, stateCode, districtCode }) => ({ code, name, stateCode, districtCode }))

await mkdir(path.dirname(output), { recursive: true })
await writeFile(output, JSON.stringify({ source: 'Local Government Directory (LGD), Ministry of Panchayati Raj, Government of India; mirrored by lgd-json-api.vercel.app', license: 'Government Open Data License - India (GODL)', fetchedAt: new Date().toISOString(), states: compactStates, districts: compactDistricts, cities: compactCities }), 'utf8')
console.log(`Saved ${states.length} states/UTs, ${districts.length} districts, and ${cities.length} urban local bodies to ${path.relative(root, output)}.`)
