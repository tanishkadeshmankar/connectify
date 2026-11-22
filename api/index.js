import app from '../server/index.js'

export default function handler(req, res) {
  const rewrittenUrl = new URL(req.url, 'http://vercel.local')
  const routePath = rewrittenUrl.searchParams.get('path')

  if (!routePath) {
    return res.status(404).json({ error: 'API route not found.' })
  }

  rewrittenUrl.searchParams.delete('path')
  const query = rewrittenUrl.searchParams.toString()
  req.url = `/api/${routePath}${query ? `?${query}` : ''}`

  return app(req, res)
}
