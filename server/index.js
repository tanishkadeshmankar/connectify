import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { communities as communityData, events as eventData } from './data.js'
import { Community, Event } from './models.js'
import { router, sendDueReminders } from './routes.js'

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured before starting Connectify in production.')
}

const app = express()
const port = Number(process.env.PORT) || 3001
const dirname = path.dirname(fileURLToPath(import.meta.url))
let databaseReady = Promise.resolve()

app.use(helmet({
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'], imgSrc: ["'self'", 'data:', 'https:'],
  } },
}))
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json({ limit: '30kb' }))
app.use('/api', async (_req, _res, next) => {
  await databaseReady
  next()
})
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }))
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }))
app.use('/api', router)
app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }))

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(dirname, '../dist')
  app.use(express.static(clientDist))
  app.get('*path', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')))
}

app.use((err, _req, res, _next) => {
  console.error(err)
  if (err?.code === 11000) return res.status(409).json({ error: 'This request has already been recorded.' })
  res.status(500).json({ error: 'Something went wrong. Please try again.' })
})

async function seedCatalog() {
  for (const source of communityData) {
    let group = await Community.findOne({ legacyKey: source.id })
    if (!group) group = await Community.create({
      legacyKey: source.id, name: source.name, category: source.category, state: source.state, district: source.district, city: source.city, members: source.members, handlerName: source.handlerName, approvalStatus: 'approved',
      mode: source.mode, emoji: source.emoji, tone: source.tone, description: source.description,
      membershipMode: source.membershipMode, rules: source.rules,
      objectives: source.objectives, schedule: source.schedule, venue: source.venue, feeLabel: source.feeLabel,
      feeAmount: source.feeAmount, capacity: source.capacity, spotsRemaining: source.spotsRemaining,
      eligibility: source.eligibility, questions: source.questions,
    })
    else await Community.updateOne({ _id: group._id }, { $set: { state: source.state, district: source.district, handlerName: source.handlerName, approvalStatus: 'approved' } })
  }
  for (const source of eventData) {
    let event = await Event.findOne({ legacyKey: source.id })
    if (!event) {
      const group = await Community.findOne({ legacyKey: source.communityId })
      event = await Event.create({
        legacyKey: source.id, community: group._id, title: source.title, description: source.description,
        startsAt: new Date(source.startsAt), time: source.time, place: source.place, mode: source.mode,
        capacity: source.capacity, registeredCount: source.capacity - source.spots, feeLabel: source.feeLabel,
        feeAmount: source.feeAmount, eligibility: source.eligibility,
        registrationDeadline: new Date(source.registrationDeadline), emoji: source.emoji, tone: source.tone, category: source.category,
      })
    }
    await Community.updateOne({ legacyKey: source.communityId }, { nextEvent: event._id })
  }
  console.log('Connectify starter communities and events are ready in MongoDB.')
}

if (process.env.MONGODB_URI) {
  databaseReady = mongoose.connect(process.env.MONGODB_URI)
    .then(seedCatalog)
    .catch((error) => console.error('MongoDB connection failed:', error.message))
} else {
  console.log('MongoDB is not configured. Account and form data will stay in memory until the server stops.')
}

const reminderTimer = setInterval(() => sendDueReminders().catch((error) => console.error('Reminder check failed:', error.message)), 30_000)
reminderTimer.unref()

export default app

if (!process.env.VERCEL) {
  const host = '0.0.0.0'
  app.listen(port, host, () => console.log(`Connectify API listening on http://localhost:${port}`))
}
