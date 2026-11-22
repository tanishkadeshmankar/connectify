import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import mongoose from 'mongoose'
import { communities as sampleCommunities, events as sampleEvents } from './data.js'
import { memory } from './memory-store.js'
import { Community, CommunityMessage, Event, EventRegistration, EventReminder, Follow, InterestRequest, MembershipApplication, Notification, User, VolunteerApplication } from './models.js'

export const router = Router()
const WEEK = 7 * 24 * 60 * 60
const jwtSecret = process.env.JWT_SECRET || 'connectify-local-development-secret-change-before-deploying'
const connected = () => mongoose.connection.readyState === 1

const cookieValue = (header, key) => header?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${key}=`))?.slice(key.length + 1)
const setSession = (res, userId) => {
  const token = jwt.sign({ sub: String(userId) }, jwtSecret, { expiresIn: WEEK })
  res.setHeader('Set-Cookie', `connectify_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${WEEK}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`)
}
const clearSession = (res) => res.setHeader('Set-Cookie', 'connectify_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0')
const idOf = (doc) => {
  if (doc?._id) return String(doc._id)
  if (doc?.constructor?.name === 'ObjectId') return doc.toString()
  return String(doc?.id ?? doc)
}
const publicUser = (user, own = false) => ({
  id: idOf(user), fullName: user.fullName, city: user.city, interests: user.interests || [],
  skills: user.skills || [], bio: user.bio || '', discoverable: user.discoverable !== false,
  ...(own ? { email: user.email, ageConfirmed: Boolean(user.ageConfirmed), role: user.role || 'user' } : {}),
})
const addNotification = async (userId, type, title, body, relatedId = '') => {
  if (connected()) return Notification.create({ user: userId, type, title, body, relatedId })
  const notification = { id: randomUUID(), user: userId, type, title, body, relatedId, readAt: null, createdAt: new Date().toISOString() }
  memory.notifications.unshift(notification)
  return notification
}
const getCommunity = async (key) => connected() ? Community.findOne({ legacyKey: key }) : sampleCommunities.find((item) => item.id === key) || memory.submittedCommunities.find((item) => item.id === key || item.legacyKey === key)
const getEvent = async (key) => {
  if (!connected()) return sampleEvents.find((item) => item.id === key)
  const event = await Event.findOne({ legacyKey: key }).populate('community')
  return event
}
const communityJson = async (item) => {
  if (!item) return null
  if (!connected()) return item
  const next = item.nextEvent ? await Event.findById(item.nextEvent) : null
  return { id: item.legacyKey, name: item.name, category: item.category, state: item.state, district: item.district, city: item.city, members: item.members, mode: item.mode, emoji: item.emoji, tone: item.tone, description: item.description, membershipMode: item.membershipMode, rules: item.rules, objectives: item.objectives, schedule: item.schedule, venue: item.venue, feeLabel: item.feeLabel, feeAmount: item.feeAmount, capacity: item.capacity, spotsRemaining: item.spotsRemaining, eligibility: item.eligibility, questions: item.questions, handlerName: item.handlerName || 'Community organizing team', discountCode: item.discountCode || '', nextEventId: next?.legacyKey || null }
}
const eventJson = (item) => {
  if (!item) return null
  if (!connected()) return item
  return { id: item.legacyKey, communityId: item.community?.legacyKey || '', community: item.community?.name || '', title: item.title, description: item.description, date: new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' }).format(item.startsAt), startsAt: item.startsAt, time: item.time, place: item.place, mode: item.mode, capacity: item.capacity, spots: Math.max(0, item.capacity - item.registeredCount), feeLabel: item.feeLabel, feeAmount: item.feeAmount, eligibility: item.eligibility, registrationDeadline: item.registrationDeadline, emoji: item.emoji, tone: item.tone, category: item.category }
}

router.use(async (req, _res, next) => {
  try {
    const token = cookieValue(req.headers.cookie, 'connectify_session')
    if (token) {
      const payload = jwt.verify(token, jwtSecret)
      const user = connected() ? await User.findById(payload.sub) : memory.users.find((entry) => entry.id === payload.sub)
      if (user) req.user = user
    }
    next()
  } catch { next() }
})

const requireUser = (req, res, next) => req.user ? next() : res.status(401).json({ error: 'Please sign in to continue.' })
const communitySubmissionSchema = z.object({ name: z.string().trim().min(3).max(100), category: z.string().trim().min(2).max(40), state: z.string().trim().min(2).max(80), district: z.string().trim().min(2).max(80), city: z.string().trim().min(2).max(80), mode: z.enum(['Online', 'In person', 'Hybrid']), schedule: z.string().trim().min(2).max(160), venue: z.string().trim().min(2).max(160), objectives: z.array(z.string().trim().min(5).max(220)).min(1).max(8), handlerName: z.string().trim().min(2).max(80), capacity: z.number().int().min(1).max(500), feeAmount: z.number().min(0).max(100000), discountCode: z.string().trim().max(40).optional().default('') })
const authRateSchema = z.object({ accountType: z.enum(['member', 'community']).default('member'), fullName: z.string().trim().min(2).max(80), email: z.string().trim().email().max(160), password: z.string().min(10).max(128), city: z.string().trim().min(2).max(80), interests: z.array(z.string().trim().min(1).max(40)).max(12).default([]), ageConfirmed: z.literal(true), bio: z.string().trim().max(400).optional().default(''), community: communitySubmissionSchema.optional() }).superRefine((data, context) => { if (data.accountType === 'community' && !data.community) context.addIssue({ code: 'custom', message: 'Complete your community details before creating the account.', path: ['community'] }) })
const loginSchema = z.object({ email: z.string().trim().email().max(160), password: z.string().min(1).max(128) })
const profileSchema = z.object({ fullName: z.string().trim().min(2).max(80), city: z.string().trim().min(2).max(80), interests: z.array(z.string().trim().min(1).max(40)).max(12), skills: z.array(z.string().trim().min(1).max(40)).max(20).default([]), bio: z.string().trim().max(400).default(''), discoverable: z.boolean() })

router.get('/health', (_req, res) => res.json({ status: 'ok', app: 'Connectify', database: connected() ? 'connected' : 'not-configured' }))
router.get('/discovery', async (req, res, next) => {
  try {
    const [groups, listings] = connected()
      ? await Promise.all([Community.find({ approvalStatus: 'approved' }).sort({ name: 1 }), Event.find().populate('community').sort({ startsAt: 1 })])
      : [[...sampleCommunities, ...memory.submittedCommunities.filter((item) => item.approvalStatus === 'approved')], sampleEvents]
    const location = { state: String(req.query.state || ''), district: String(req.query.district || ''), city: String(req.query.city || '') }
    const matches = (item) => (!location.state || item.state?.toLowerCase() === location.state.toLowerCase()) && (!location.district || item.district?.toLowerCase() === location.district.toLowerCase()) && (!location.city || item.city?.toLowerCase() === location.city.toLowerCase())
    const filteredGroups = groups.filter(matches)
    const allowedIds = new Set(filteredGroups.map((item) => connected() ? item.legacyKey : item.id))
    const filteredEvents = listings.filter((item) => allowedIds.has(connected() ? item.community?.legacyKey : item.communityId))
    res.json({ city: location.city || 'Nashik', location, communities: await Promise.all(filteredGroups.map(communityJson)), events: filteredEvents.map(eventJson), source: connected() ? 'mongodb' : 'sample-data' })
  } catch (error) { next(error) }
})
router.get('/communities', async (req, res, next) => {
  try {
    const query = String(req.query.search || '').toLowerCase()
    const category = String(req.query.category || '')
    const city = String(req.query.city || '')
    const state = String(req.query.state || '')
    const district = String(req.query.district || '')
    const groups = connected() ? await Community.find({ approvalStatus: 'approved' }) : [...sampleCommunities, ...memory.submittedCommunities.filter((item) => item.approvalStatus === 'approved')]
    const filtered = groups.filter((item) => (!query || `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(query)) && (!category || category === 'All' || item.category === category) && (!state || item.state.toLowerCase() === state.toLowerCase()) && (!district || item.district.toLowerCase() === district.toLowerCase()) && (!city || item.city.toLowerCase() === city.toLowerCase()))
    res.json(await Promise.all(filtered.map(communityJson)))
  } catch (error) { next(error) }
})
router.get('/communities/:id', async (req, res, next) => {
  try {
    const item = await getCommunity(req.params.id)
    if (!item) return res.status(404).json({ error: 'Community not found.' })
    const group = await communityJson(item)
    const nextEvent = group.nextEventId ? await getEvent(group.nextEventId) : null
    res.json({ ...group, nextEvent: eventJson(nextEvent) })
  } catch (error) { next(error) }
})
router.get('/communities/:id/membership', requireUser, async (req, res, next) => {
  try {
    const community = await getCommunity(req.params.id)
    if (!community) return res.status(404).json({ error: 'Community not found.' })
    const membership = connected()
      ? await MembershipApplication.findOne({ user: idOf(req.user), community: community._id })
      : memory.applications.find((entry) => entry.user === idOf(req.user) && entry.community === community.id)
    res.json({ status: membership?.status || 'none', canChat: membership?.status === 'approved', approver: community.handlerName || 'Community organizing team' })
  } catch (error) { next(error) }
})
router.get('/events', async (req, res, next) => {
  try {
    const listings = connected() ? await Event.find().populate('community').sort({ startsAt: 1 }) : sampleEvents
    const state = String(req.query.state || '').toLowerCase(), district = String(req.query.district || '').toLowerCase(), city = String(req.query.city || '').toLowerCase()
    const filtered = listings.filter((event) => {
      const group = connected() ? event.community : sampleCommunities.find((item) => item.id === event.communityId)
      return group && (!state || group.state.toLowerCase() === state) && (!district || group.district.toLowerCase() === district) && (!city || group.city.toLowerCase() === city)
    })
    res.json(filtered.map(eventJson))
  } catch (error) { next(error) }
})
router.get('/events/:id', async (req, res, next) => {
  try {
    const event = await getEvent(req.params.id)
    if (!event) return res.status(404).json({ error: 'Event not found.' })
    const json = eventJson(event)
    const group = await getCommunity(json.communityId)
    res.json({ ...json, communityDetails: await communityJson(group) })
  } catch (error) { next(error) }
})

router.post('/auth/register', async (req, res, next) => {
  try {
    const parsed = authRateSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Check the details and try again.' })
    const { accountType, community: communityInput, ...profileData } = parsed.data
    const email = profileData.email.toLowerCase()
    const exists = connected() ? await User.exists({ email }) : memory.users.some((entry) => entry.email === email)
    if (exists) return res.status(409).json({ error: 'An account with this email already exists. Try signing in.' })
    const passwordHash = await bcrypt.hash(profileData.password, 12)
    const role = accountType === 'community' ? 'communityAdmin' : 'user'
    const user = connected() ? await User.create({ ...profileData, email, passwordHash, role }) : { id: randomUUID(), ...profileData, email, passwordHash, skills: [], discoverable: true, role }
    if (!connected()) memory.users.push(user)
    if (accountType === 'community') {
      const input = communityInput
      const submittedKey = `submitted-${randomUUID()}`
      const communityRecord = {
        id: submittedKey, legacyKey: submittedKey, owner: idOf(user), name: input.name, category: input.category,
        state: input.state, district: input.district, city: input.city, members: 0, mode: input.mode, membershipMode: 'approval',
        rules: ['Follow Connectify community guidelines', 'Keep event and fee information accurate'], emoji: '✳', tone: 'green',
        description: input.objectives.join('. '), objectives: input.objectives, schedule: input.schedule, venue: input.venue,
        handlerName: input.handlerName, feeLabel: input.feeAmount > 0 ? `₹${input.feeAmount}` : 'Free', feeAmount: input.feeAmount,
        discountCode: input.discountCode, capacity: input.capacity, spotsRemaining: input.capacity, approvalStatus: 'approved',
      }
      if (connected()) {
        communityRecord.legacyKey = `submitted-${randomUUID()}`
        const created = await Community.create({ ...communityRecord, owner: idOf(user) })
        communityRecord.id = created.legacyKey
      } else memory.submittedCommunities.push(communityRecord)
    }
    setSession(res, idOf(user))
    res.status(201).json({ user: publicUser(user, true), communityStatus: accountType === 'community' ? 'approved' : undefined })
  } catch (error) { next(error) }
})
router.get('/my-community', requireUser, async (req, res, next) => {
  try {
    const item = connected() ? await Community.findOne({ owner: idOf(req.user) }) : memory.submittedCommunities.find((entry) => entry.owner === idOf(req.user))
    if (!item) return res.json(null)
    res.json({ id: idOf(item), name: item.name, state: item.state, district: item.district, city: item.city, handlerName: item.handlerName, status: item.approvalStatus || 'pending' })
  } catch (error) { next(error) }
})
router.get('/host/dashboard', requireUser, async (req, res, next) => {
  try {
    if (req.user.role !== 'communityAdmin') return res.status(403).json({ error: 'This dashboard is for community hosts.' })
    const community = connected() ? await Community.findOne({ owner: idOf(req.user) }) : memory.submittedCommunities.find((entry) => entry.owner === idOf(req.user))
    if (!community) return res.json({ community: null, applications: [] })
    if (connected()) {
      const rows = await MembershipApplication.find({ community: community._id }).populate('user').sort({ createdAt: -1 })
      return res.json({ community: { id: community.legacyKey, name: community.name, status: community.approvalStatus }, applications: rows.map((row) => ({ id: idOf(row), fullName: row.user?.fullName || 'Connectify member', city: row.user?.city || '', interests: row.user?.interests || [], answers: Object.fromEntries(row.answers || []), status: row.status, createdAt: row.createdAt })) })
    }
    const rows = memory.applications.filter((entry) => entry.community === community.id).map((entry) => {
      const applicant = memory.users.find((person) => person.id === entry.user)
      return { id: entry.id, fullName: applicant?.fullName || 'Connectify member', city: applicant?.city || '', interests: applicant?.interests || [], answers: entry.answers || {}, status: entry.status, createdAt: entry.createdAt }
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    res.json({ community: { id: community.id, name: community.name, status: community.approvalStatus || 'pending' }, applications: rows })
  } catch (error) { next(error) }
})
router.post('/host/applications/:id/status', requireUser, async (req, res, next) => {
  try {
    if (req.user.role !== 'communityAdmin') return res.status(403).json({ error: 'This action is for community hosts.' })
    const parsed = z.object({ status: z.enum(['approved', 'rejected']) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Choose approve or decline.' })
    const community = connected() ? await Community.findOne({ owner: idOf(req.user) }) : memory.submittedCommunities.find((entry) => entry.owner === idOf(req.user))
    if (!community) return res.status(404).json({ error: 'No community is linked to this host account.' })
    if (community.approvalStatus === 'pending') return res.status(409).json({ error: 'Your community listing must be approved before you can review its membership applications.' })
    const application = connected()
      ? await MembershipApplication.findOne({ _id: req.params.id, community: community._id })
      : memory.applications.find((entry) => entry.id === req.params.id && entry.community === community.id)
    if (!application) return res.status(404).json({ error: 'Application not found for your community.' })
    if (application.status !== 'pending') return res.status(409).json({ error: 'This application has already been reviewed.' })
    if (parsed.data.status === 'approved' && community.spotsRemaining <= 0) return res.status(409).json({ error: 'There are no community seats available.' })
    application.status = parsed.data.status
    if (connected()) {
      await application.save()
      if (parsed.data.status === 'approved') await Community.updateOne({ _id: community._id, spotsRemaining: { $gt: 0 } }, { $inc: { spotsRemaining: -1, members: 1 } })
    } else if (parsed.data.status === 'approved') { community.spotsRemaining -= 1; community.members += 1 }
    await addNotification(idOf(application.user), `membership-${parsed.data.status}`, parsed.data.status === 'approved' ? 'Your request was approved' : 'Your request was declined', `${community.name} ${parsed.data.status} your membership request.`, idOf(application))
    res.json({ id: idOf(application), status: application.status })
  } catch (error) { next(error) }
})
router.post('/auth/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email and password.' })
    const email = parsed.data.email.toLowerCase()
    const user = connected() ? await User.findOne({ email }) : memory.users.find((entry) => entry.email === email)
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' })
    setSession(res, idOf(user))
    res.json({ user: publicUser(user, true) })
  } catch (error) { next(error) }
})
router.post('/auth/logout', (_req, res) => { clearSession(res); res.json({ status: 'signed-out' }) })
router.get('/auth/me', (req, res) => req.user ? res.json({ user: publicUser(req.user, true) }) : res.status(401).json({ error: 'Please sign in.' }))
router.patch('/profile', requireUser, async (req, res, next) => {
  try {
    const parsed = profileSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Check your profile details.' })
    const updated = connected() ? await User.findByIdAndUpdate(idOf(req.user), parsed.data, { new: true, runValidators: true }) : Object.assign(req.user, parsed.data)
    res.json({ user: publicUser(updated, true) })
  } catch (error) { next(error) }
})

router.get('/people', async (req, res, next) => {
  try {
    const query = String(req.query.search || '').toLowerCase()
    const people = connected() ? await User.find({ discoverable: true, ...(req.user ? { _id: { $ne: idOf(req.user) } } : {}) }).limit(60) : memory.users.filter((person) => person.discoverable !== false && person.id !== idOf(req.user))
    const filtered = people.filter((person) => !query || `${person.fullName} ${person.city} ${(person.interests || []).join(' ')} ${(person.skills || []).join(' ')}`.toLowerCase().includes(query))
    const ids = filtered.map(idOf)
    const follows = connected() && req.user ? await Follow.find({ follower: idOf(req.user), followed: { $in: ids } }).select('followed') : memory.follows.filter((entry) => entry.follower === idOf(req.user)).map((entry) => ({ followed: entry.followed }))
    const followed = new Set(follows.map((item) => String(item.followed)))
    const viewerInterests = new Set((req.user?.interests || []).map((interest) => interest.toLowerCase()))
    const ranked = filtered.map((person) => {
      const shared = (person.interests || []).filter((interest) => viewerInterests.has(interest.toLowerCase())).length
      const sameCity = Boolean(req.user && person.city.toLowerCase() === req.user.city.toLowerCase())
      return { person, shared, sameCity }
    }).sort((a, b) => Number(b.sameCity) - Number(a.sameCity) || b.shared - a.shared)
    res.json(ranked.map(({ person, shared, sameCity }) => ({ ...publicUser(person), following: followed.has(idOf(person)), matchSummary: req.user ? [sameCity ? 'Same city' : null, shared ? `${shared} shared interest${shared === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ') : '' })))
  } catch (error) { next(error) }
})
router.post('/people/:id/follow', requireUser, async (req, res, next) => {
  try {
    if (req.params.id === idOf(req.user)) return res.status(400).json({ error: 'You cannot follow your own profile.' })
    const target = connected() ? await User.findOne({ _id: req.params.id, discoverable: true }) : memory.users.find((person) => person.id === req.params.id && person.discoverable !== false)
    if (!target) return res.status(404).json({ error: 'This profile is not available for discovery.' })
    if (connected()) await Follow.updateOne({ follower: idOf(req.user), followed: idOf(target) }, { $setOnInsert: { follower: idOf(req.user), followed: idOf(target) } }, { upsert: true })
    else if (!memory.follows.some((entry) => entry.follower === idOf(req.user) && entry.followed === idOf(target))) memory.follows.push({ id: randomUUID(), follower: idOf(req.user), followed: idOf(target), createdAt: new Date().toISOString() })
    await addNotification(idOf(target), 'new-follower', 'Someone followed you', `${req.user.fullName} started following your profile.`)
    res.json({ status: 'following' })
  } catch (error) { next(error) }
})
router.delete('/people/:id/follow', requireUser, async (req, res, next) => {
  try {
    if (connected()) await Follow.deleteOne({ follower: idOf(req.user), followed: req.params.id })
    else memory.follows = memory.follows.filter((entry) => !(entry.follower === idOf(req.user) && entry.followed === req.params.id))
    res.json({ status: 'unfollowed' })
  } catch (error) { next(error) }
})
router.get('/followers', requireUser, async (req, res, next) => {
  try {
    const [outgoing, incoming] = connected()
      ? await Promise.all([Follow.find({ follower: idOf(req.user) }).populate('followed'), Follow.find({ followed: idOf(req.user) }).populate('follower')])
      : [memory.follows.filter((entry) => entry.follower === idOf(req.user)).map((entry) => ({ followed: memory.users.find((person) => person.id === entry.followed) })), memory.follows.filter((entry) => entry.followed === idOf(req.user)).map((entry) => ({ follower: memory.users.find((person) => person.id === entry.follower) }))]
    const followingIds = new Set(outgoing.map((entry) => idOf(entry.followed)).filter((id) => id !== 'undefined'))
    res.json({ following: outgoing.map((entry) => entry.followed).filter(Boolean).map((person) => ({ ...publicUser(person), following: true })), followers: incoming.map((entry) => entry.follower).filter(Boolean).map((person) => ({ ...publicUser(person), following: followingIds.has(idOf(person)) })) })
  } catch (error) { next(error) }
})

router.post('/communities/:id/applications', requireUser, async (req, res, next) => {
  try {
    const community = await getCommunity(req.params.id)
    if (!community) return res.status(404).json({ error: 'Community not found.' })
    if (community.membershipMode === 'invite-only') return res.status(403).json({ error: 'This community is invite-only. Send an interest message to the organizers instead.' })
    if (community.spotsRemaining <= 0) return res.status(409).json({ error: 'This community currently has no places available.' })
    const answers = z.record(z.string().max(1000)).safeParse(req.body.answers || {})
    if (!answers.success) return res.status(400).json({ error: 'Please check your application answers.' })
    if ((community.questions || []).some((_, index) => !answers.data[String(index)]?.trim())) return res.status(400).json({ error: 'Please answer each community question before sending your application.' })
    const existing = connected() ? await MembershipApplication.findOne({ user: idOf(req.user), community: community._id }) : memory.applications.find((item) => item.user === idOf(req.user) && item.community === community.id)
    if (existing) return res.status(409).json({ error: `You already have a ${existing.status} application for this community.` })
    const status = community.membershipMode === 'open' ? 'approved' : 'pending'
    const appRecord = connected()
      ? await MembershipApplication.create({ user: idOf(req.user), community: community._id, answers: answers.data, status })
      : { id: randomUUID(), user: idOf(req.user), community: community.id, answers: answers.data, status, createdAt: new Date().toISOString() }
    if (!connected()) memory.applications.push(appRecord)
    if (status === 'approved') {
      if (connected()) await Community.updateOne({ _id: community._id, spotsRemaining: { $gt: 0 } }, { $inc: { spotsRemaining: -1, members: 1 } })
      else { community.spotsRemaining -= 1; community.members += 1 }
    }
    const message = status === 'approved' ? `You’ve joined ${community.name}.` : `Your request to join ${community.name} is pending review.`
    await addNotification(idOf(req.user), status === 'approved' ? 'membership-approved' : 'application-submitted', status === 'approved' ? 'You’re in' : 'Application sent', message, connected() ? String(appRecord._id) : appRecord.id)
    res.status(201).json({ id: idOf(appRecord), status: appRecord.status, approver: community.handlerName || 'Community organizing team', message })
  } catch (error) { next(error) }
})
router.get('/applications', requireUser, async (req, res, next) => {
  try {
    if (connected()) {
      const rows = await MembershipApplication.find({ user: idOf(req.user) }).populate('community').sort({ createdAt: -1 })
      return res.json(rows.map((row) => ({ id: idOf(row), community: row.community.name, communityId: row.community.legacyKey, approver: row.community.handlerName || 'Community organizing team', status: row.status, createdAt: row.createdAt })))
    }
    res.json(memory.applications.filter((row) => row.user === idOf(req.user)).map((row) => { const community = sampleCommunities.find((group) => group.id === row.community); return { id: row.id, community: community?.name, communityId: row.community, approver: community?.handlerName || 'Community organizing team', status: row.status, createdAt: row.createdAt } }))
  } catch (error) { next(error) }
})
router.post('/communities/:id/interest', requireUser, async (req, res, next) => {
  try {
    const community = await getCommunity(req.params.id)
    if (!community) return res.status(404).json({ error: 'Community not found.' })
    const parsed = z.object({ message: z.string().trim().min(10).max(600) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Write a short message of at least 10 characters.' })
    const record = connected() ? await InterestRequest.create({ user: idOf(req.user), community: community._id, message: parsed.data.message }) : { id: randomUUID(), user: idOf(req.user), community: community.id, message: parsed.data.message, status: 'sent', createdAt: new Date().toISOString() }
    if (!connected()) memory.interestRequests.push(record)
    await addNotification(idOf(req.user), 'interest-sent', 'Interest message sent', `Your message to ${community.name} was sent.`, idOf(record))
    res.status(201).json({ id: idOf(record), status: 'sent', message: 'Your message was sent to the community.' })
  } catch (error) { next(error) }
})
router.get('/interest-requests', requireUser, async (req, res, next) => {
  try {
    if (connected()) {
      const rows = await InterestRequest.find({ user: idOf(req.user) }).populate('community').sort({ createdAt: -1 })
      return res.json(rows.map((entry) => ({ id: idOf(entry), community: entry.community.name, message: entry.message, status: entry.status, createdAt: entry.createdAt })))
    }
    res.json(memory.interestRequests.filter((entry) => entry.user === idOf(req.user)).map((entry) => ({ id: entry.id, community: sampleCommunities.find((group) => group.id === entry.community)?.name, message: entry.message, status: entry.status, createdAt: entry.createdAt })))
  } catch (error) { next(error) }
})

async function requireCommunityMember(req, res) {
  const community = await getCommunity(req.params.id)
  if (!community) { res.status(404).json({ error: 'Community not found.' }); return null }
  const membership = connected()
    ? await MembershipApplication.findOne({ user: idOf(req.user), community: community._id, status: 'approved' })
    : memory.applications.find((entry) => entry.user === idOf(req.user) && entry.community === community.id && entry.status === 'approved')
  if (!membership) { res.status(403).json({ error: 'Member chat is only available after your community membership is approved.' }); return null }
  return community
}

router.get('/communities/:id/chat', requireUser, async (req, res, next) => {
  try {
    const community = await requireCommunityMember(req, res)
    if (!community) return
    const rows = connected()
      ? await CommunityMessage.find({ community: community._id }).populate('user').sort({ createdAt: -1 }).limit(100)
      : memory.messages.filter((entry) => entry.community === community.id).slice(-100)
    res.json(rows.reverse().map((entry) => ({ id: idOf(entry), message: entry.message, sender: connected() ? publicUser(entry.user) : publicUser(memory.users.find((person) => person.id === entry.user)), mine: (connected() ? idOf(entry.user) : entry.user) === idOf(req.user), createdAt: entry.createdAt })))
  } catch (error) { next(error) }
})
router.post('/communities/:id/chat', requireUser, rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }), async (req, res, next) => {
  try {
    const community = await requireCommunityMember(req, res)
    if (!community) return
    const parsed = z.object({ message: z.string().trim().min(1).max(1000) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Write a message up to 1,000 characters.' })
    const message = parsed.data.message
    const containsEmail = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(message)
    const containsPhone = /(?:\+?91[\s-]?)?[6-9](?:[\s().-]*\d){9}|\+\d[\d\s().-]{7,}\d/.test(message)
    if (containsEmail || containsPhone) return res.status(400).json({ error: 'For privacy, don’t post email addresses or phone numbers in community chat.' })
    const entry = connected()
      ? await CommunityMessage.create({ user: idOf(req.user), community: community._id, message })
      : { id: randomUUID(), user: idOf(req.user), community: community.id, message, createdAt: new Date().toISOString() }
    if (!connected()) memory.messages.push(entry)
    res.status(201).json({ id: idOf(entry), message: entry.message, sender: publicUser(req.user), mine: true, createdAt: entry.createdAt })
  } catch (error) { next(error) }
})

router.get('/calendar', async (req, res, next) => {
  try {
    const month = String(req.query.month || '')
    const listings = connected() ? await Event.find().populate('community').sort({ startsAt: 1 }) : sampleEvents
    const state = String(req.query.state || '').toLowerCase(), district = String(req.query.district || '').toLowerCase(), city = String(req.query.city || '').toLowerCase()
    const atLocation = listings.filter((event) => {
      const group = connected() ? event.community : sampleCommunities.find((item) => item.id === event.communityId)
      return group && (!state || group.state.toLowerCase() === state) && (!district || group.district.toLowerCase() === district) && (!city || group.city.toLowerCase() === city)
    })
    const rows = atLocation.map(eventJson).filter((event) => !month || new Date(event.startsAt).toISOString().slice(0, 7) === month)
    const reminders = req.user ? (connected() ? await EventReminder.find({ user: idOf(req.user), sentAt: null }).populate('event') : memory.reminders.filter((entry) => entry.user === idOf(req.user) && !entry.sentAt)) : []
    res.json({ events: rows, reminders: reminders.map((entry) => connected() ? { id: idOf(entry), eventId: entry.event?.legacyKey, event: entry.event?.title, remindAt: entry.remindAt } : entry) })
  } catch (error) { next(error) }
})
router.post('/events/:id/register', requireUser, async (req, res, next) => {
  try {
    const event = await getEvent(req.params.id)
    if (!event) return res.status(404).json({ error: 'Event not found.' })
    const parsed = z.object({ fullName: z.string().trim().min(2).max(80), email: z.string().trim().email().max(160), forWhom: z.enum(['myself', 'child-with-guardian', 'someone-else']), note: z.string().trim().max(500).optional().default(''), confirmEligibility: z.literal(true) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Complete all required fields.' })
    const eventId = connected() ? idOf(event) : event.id
    const already = connected() ? await EventRegistration.exists({ user: idOf(req.user), event: eventId, status: { $ne: 'cancelled' } }) : memory.registrations.some((entry) => entry.user === idOf(req.user) && entry.event === eventId && entry.status !== 'cancelled')
    if (already) return res.status(409).json({ error: 'You already have a registration for this event.' })
    if (connected()) {
      const updated = await Event.findOneAndUpdate({ _id: eventId, registeredCount: { $lt: event.capacity }, registrationDeadline: { $gt: new Date() } }, { $inc: { registeredCount: 1 } }, { new: true })
      if (!updated) return res.status(409).json({ error: 'Registration is closed or all places are filled.' })
      const registration = await EventRegistration.create({ user: idOf(req.user), event: eventId, ...parsed.data })
      await addNotification(idOf(req.user), 'event-registration', 'You’re registered', `Your place for ${event.title} is confirmed.`, String(registration._id))
      return res.status(201).json({ id: idOf(registration), status: 'registered', message: 'Your place is confirmed.' })
    }
    if (event.spots <= 0 || new Date(event.startsAt) <= new Date()) return res.status(409).json({ error: 'Registration is closed or all places are filled.' })
    const registration = { id: randomUUID(), user: idOf(req.user), event: event.id, ...parsed.data, status: 'registered', createdAt: new Date().toISOString() }
    memory.registrations.push(registration)
    event.spots -= 1
    await addNotification(idOf(req.user), 'event-registration', 'You’re registered', `Your place for ${event.title} is confirmed.`, registration.id)
    res.status(201).json({ id: registration.id, status: 'registered', message: 'Your place is confirmed.' })
  } catch (error) { next(error) }
})
router.get('/registrations', requireUser, async (req, res, next) => {
  try {
    if (connected()) {
      const rows = await EventRegistration.find({ user: idOf(req.user) }).populate({ path: 'event', populate: { path: 'community' } }).sort({ createdAt: -1 })
      return res.json(rows.map((row) => ({ id: idOf(row), event: eventJson(row.event), status: row.status })))
    }
    res.json(memory.registrations.filter((row) => row.user === idOf(req.user)).map((row) => ({ id: row.id, event: sampleEvents.find((event) => event.id === row.event), status: row.status })))
  } catch (error) { next(error) }
})
router.post('/events/:id/reminders', requireUser, async (req, res, next) => {
  try {
    const event = await getEvent(req.params.id)
    if (!event) return res.status(404).json({ error: 'Event not found.' })
    const parsed = z.object({ minutesBefore: z.coerce.number().int().min(5).max(10080) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Choose a reminder between 5 minutes and 7 days before the event.' })
    const startsAt = new Date(event.startsAt)
    const remindAt = new Date(startsAt.getTime() - parsed.data.minutesBefore * 60_000)
    if (remindAt <= new Date()) return res.status(400).json({ error: 'That reminder time has already passed.' })
    if (connected()) {
      const reminder = await EventReminder.findOneAndUpdate({ user: idOf(req.user), event: idOf(event) }, { remindAt, sentAt: null }, { upsert: true, new: true })
      return res.status(201).json({ id: idOf(reminder), remindAt })
    }
    const existing = memory.reminders.find((entry) => entry.user === idOf(req.user) && entry.eventId === event.id)
    if (existing) { existing.remindAt = remindAt.toISOString(); existing.sentAt = null; return res.json(existing) }
    const reminder = { id: randomUUID(), user: idOf(req.user), eventId: event.id, event: event.title, remindAt: remindAt.toISOString(), sentAt: null }
    memory.reminders.push(reminder)
    res.status(201).json(reminder)
  } catch (error) { next(error) }
})
router.get('/notifications', requireUser, async (req, res, next) => {
  try {
    const rows = connected() ? await Notification.find({ user: idOf(req.user) }).sort({ createdAt: -1 }).limit(50) : memory.notifications.filter((entry) => entry.user === idOf(req.user)).slice(0, 50)
    res.json(rows.map((row) => ({ id: idOf(row), type: row.type, title: row.title, body: row.body, read: Boolean(row.readAt), createdAt: row.createdAt })))
  } catch (error) { next(error) }
})
router.post('/notifications/:id/read', requireUser, async (req, res, next) => {
  try {
    if (connected()) await Notification.updateOne({ _id: req.params.id, user: idOf(req.user) }, { readAt: new Date() })
    else { const row = memory.notifications.find((entry) => entry.id === req.params.id && entry.user === idOf(req.user)); if (row) row.readAt = new Date().toISOString() }
    res.json({ status: 'read' })
  } catch (error) { next(error) }
})

router.post('/volunteer-applications', requireUser, async (req, res, next) => {
  try {
    const parsed = z.object({ fullName: z.string().trim().min(2).max(80), email: z.string().trim().email().max(160), phone: z.string().trim().max(30).optional().default(''), motive: z.string().trim().min(20).max(1000), ideas: z.string().trim().min(10).max(1000), availability: z.string().trim().max(200).optional().default(''), privacyConsent: z.literal(true) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Complete the required volunteer details.' })
    const application = connected() ? await VolunteerApplication.create({ user: idOf(req.user), ...parsed.data }) : { id: randomUUID(), user: idOf(req.user), ...parsed.data, status: 'submitted', createdAt: new Date().toISOString() }
    if (!connected()) memory.volunteerApplications.push(application)
    await addNotification(idOf(req.user), 'volunteer-application', 'Volunteer interest received', 'Your volunteer details have been sent for review.', idOf(application))
    res.status(201).json({ id: idOf(application), status: 'submitted', message: 'Thanks for offering your time. Your interest has been recorded.' })
  } catch (error) { next(error) }
})
router.get('/volunteer-applications', requireUser, async (req, res, next) => {
  try {
    const rows = connected() ? await VolunteerApplication.find({ user: idOf(req.user) }).sort({ createdAt: -1 }) : memory.volunteerApplications.filter((entry) => entry.user === idOf(req.user))
    res.json(rows.map((entry) => ({ id: idOf(entry), status: entry.status, createdAt: entry.createdAt, motive: entry.motive })))
  } catch (error) { next(error) }
})

export async function sendDueReminders() {
  const now = new Date()
  if (connected()) {
    const due = await EventReminder.find({ sentAt: null, remindAt: { $lte: now } }).populate('event')
    for (const reminder of due) {
      await addNotification(idOf(reminder.user), 'event-reminder', 'Your event is coming up', `${reminder.event?.title || 'An event'} is starting soon.`, reminder.event?.legacyKey || '')
      reminder.sentAt = now
      await reminder.save()
    }
    return
  }
  for (const reminder of memory.reminders.filter((entry) => !entry.sentAt && new Date(entry.remindAt) <= now)) {
    await addNotification(reminder.user, 'event-reminder', 'Your event is coming up', `${reminder.event} is starting soon.`, reminder.eventId)
    reminder.sentAt = now.toISOString()
  }
}
