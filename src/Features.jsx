import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Award, Bell, CalendarDays, Check, ChevronLeft, ChevronRight, CircleHelp, Clock3, Compass, Heart, HeartHandshake, LockKeyhole, MapPin, MessageCircle, ShieldCheck, Users, X } from 'lucide-react'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { api, send } from './api.js'

export function LocationPicker({ value, onApply, onClose }) {
  const [directory, setDirectory] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState([value.city, value.district, value.state].filter(Boolean)[0] || '')
  const [open, setOpen] = useState(false)
  useEffect(() => { fetch('/data/india-locations.json').then((response) => { if (!response.ok) throw new Error('Could not load India’s location directory.'); return response.json() }).then(setDirectory).catch((err) => setError(err.message)) }, [])
  useEffect(() => { setQuery([value.city, value.district, value.state].filter(Boolean)[0] || '') }, [value.state, value.district, value.city])
  const entries = useMemo(() => {
    if (!directory) return []
    const statesByCode = new Map(directory.states.map((item) => [item.code, item]))
    const districtsByCode = new Map(directory.districts.map((item) => [item.code, item]))
    const places = [
      ...directory.cities.map((item) => {
        const state = statesByCode.get(item.stateCode)
        const district = item.districtCode ? districtsByCode.get(item.districtCode) : directory.districts.find((entry) => entry.stateCode === item.stateCode && item.name.toLowerCase().includes(entry.name.toLowerCase()))
        return { kind: 'City / town', name: item.name, state: state?.name || '', district: district?.name || '', city: item.name, key: `city-${item.code}`, haystack: `${item.name} ${district?.name || ''} ${state?.name || ''}` }
      }),
      ...directory.districts.map((item) => ({ kind: 'District', name: item.name, state: statesByCode.get(item.stateCode)?.name || '', district: item.name, city: '', key: `district-${item.code}`, haystack: `${item.name} ${statesByCode.get(item.stateCode)?.name || ''}` })),
      ...directory.states.map((item) => ({ kind: item.type === 'U' ? 'Union territory' : 'State', name: item.name, state: item.name, district: '', city: '', key: `state-${item.code}`, haystack: item.name })),
    ]
    return places.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
  }, [directory])
  const suggestions = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return []
    return entries.filter((item) => item.haystack.toLowerCase().includes(value)).sort((a, b) => {
      const score = (item) => item.name.toLowerCase() === value ? 4 : item.name.toLowerCase().startsWith(value) ? 3 : item.kind === 'City / town' ? 2 : 1
      return score(b) - score(a) || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
    }).slice(0, 8)
  }, [entries, query])
  const choose = (place) => { setQuery(place.name); setOpen(false); onApply({ state: place.state, district: place.district, city: place.city }) }
  const selectFirst = (event) => { if (event.key === 'Escape') setOpen(false); if (event.key === 'Enter' && suggestions[0]) { event.preventDefault(); choose(suggestions[0]) } }
  return <div className="location-picker"><div className="place-search-box"><MapPin size={18} /><input value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true) }} onKeyDown={selectFirst} placeholder="Search a city, district, or state" aria-label="Search city, district, or state" aria-expanded={open} role="combobox" aria-autocomplete="list" />{query && <button type="button" aria-label="Clear place search" onClick={() => { setQuery(''); setOpen(true) }}><X size={16} /></button>}</div>
    {open && query.trim() && <div className="place-suggestions" role="listbox">{suggestions.length ? suggestions.map((item) => <button type="button" role="option" key={item.key} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(item)}><MapPin size={15} /><span><b>{item.name}</b><small>{[item.kind, item.district, item.state].filter(Boolean).filter((value, index, array) => array.indexOf(value) === index).join(' · ')}</small></span></button>) : <div className="place-no-results">{error || (!directory ? 'Loading India places…' : 'No matching places found.')}</div>}</div>}
    <small className="location-source">Search and select any listed city, district, or state to update Connectify.</small>
  </div>
}

const sampleCoordinates = [
  { test: (item) => item.district === 'Nashik' || item.city?.toLowerCase().includes('nashik'), point: [19.9975, 73.7898] },
  { test: (item) => item.district === 'Pune' || item.city?.toLowerCase().includes('pune'), point: [18.5204, 73.8567] },
  { test: (item) => item.district === 'Mumbai' || item.city?.toLowerCase().includes('mumbai'), point: [19.076, 72.8777] },
  { test: (item) => item.state === 'Karnataka' || item.city?.toLowerCase().includes('bengaluru'), point: [12.9716, 77.5946] },
  { test: (item) => item.state === 'Delhi' || item.city?.toLowerCase().includes('new delhi'), point: [28.6139, 77.209] },
  { test: (item) => item.state === 'Tamil Nadu' || item.city?.toLowerCase().includes('chennai'), point: [13.0827, 80.2707] },
]
const pointFor = (item, index = 0, event = false) => {
  const match = sampleCoordinates.find((entry) => entry.test(item))
  if (!match) return null
  const nudge = event ? 0.009 : ((index % 5) - 2) * 0.002
  return [match.point[0] + nudge, match.point[1] + nudge]
}
function MapViewport({ points, fallbackCenter, fallbackZoom }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [35, 35], maxZoom: 11 })
    else if (points.length === 1) map.setView(points[0], 11)
    else map.setView(fallbackCenter, fallbackZoom)
  }, [map, points, fallbackCenter, fallbackZoom])
  return null
}
const stateMapCenters = {
  'Andaman And Nicobar Islands': [11.7, 92.7], 'Andhra Pradesh': [16.5, 80.6], 'Arunachal Pradesh': [28.2, 94.7], Assam: [26.2, 92.9], Bihar: [25.9, 85.1], Chandigarh: [30.7, 76.8], Chhattisgarh: [21.3, 81.6], Delhi: [28.6, 77.2], Goa: [15.5, 73.9], Gujarat: [22.3, 71.2], Haryana: [29.1, 76.1], 'Himachal Pradesh': [31.1, 77.2], 'Jammu And Kashmir': [33.8, 76.5], Jharkhand: [23.6, 85.3], Karnataka: [15.3, 76.5], Kerala: [10.5, 76.2], Ladakh: [34.2, 77.6], Lakshadweep: [10.3, 72.6], 'Madhya Pradesh': [23.5, 78.5], Maharashtra: [19.7, 75.7], Manipur: [24.8, 93.9], Meghalaya: [25.5, 91.3], Mizoram: [23.2, 92.8], Nagaland: [26.1, 94.5], Odisha: [20.3, 85.8], Puducherry: [11.9, 79.8], Punjab: [31, 75.3], Rajasthan: [26.9, 73.8], Sikkim: [27.5, 88.5], 'Tamil Nadu': [11.1, 78.7], Telangana: [17.9, 79.1], 'The Dadra And Nagar Haveli And Daman And Diu': [20.4, 72.9], Tripura: [23.8, 91.3], 'Uttar Pradesh': [26.8, 80.9], Uttarakhand: [30.1, 79], 'West Bengal': [23.5, 87.5],
}
export function DiscoveryMap({ communities, events, location, onCommunity, onEvent }) {
  const mapCommunities = useMemo(() => communities.map((item, index) => ({ ...item, point: pointFor(item, index) })).filter((item) => item.point), [communities])
  const communityPoints = useMemo(() => new Map(mapCommunities.map((item) => [item.id, item.point])), [mapCommunities])
  const mapEvents = useMemo(() => events.map((item, index) => { const communityPoint = communityPoints.get(item.communityId); return { ...item, point: communityPoint ? [communityPoint[0] + 0.012 + (index % 3) * 0.002, communityPoint[1] - 0.012 - (index % 3) * 0.002] : pointFor(item, index, true) } }).filter((item) => item.point), [events, communityPoints])
  const points = useMemo(() => [...mapCommunities.map((item) => item.point), ...mapEvents.map((item) => item.point)], [mapCommunities, mapEvents])
  const currentPlace = [location.city, location.district, location.state].filter(Boolean)[0] || 'India'
  const knownCenter = sampleCoordinates.find((entry) => entry.test(location))?.point
  const fallbackCenter = knownCenter || stateMapCenters[location.state] || [22.8, 79]
  const fallbackZoom = location.city || location.district ? 9 : location.state ? 6 : 4
  return <section className="map-section section-shell" id="map"><div className="map-heading"><div><div className="eyebrow eyebrow-muted">YOUR COMMUNITY, ON THE MAP</div><h2>Good things, <em>around {currentPlace}.</em></h2><p>Red dots are communities. Green dots are upcoming events. The map follows your selected place.</p><small className="map-accuracy-note">Pins show approximate listing areas, not exact meeting addresses.</small></div><div className="map-legend"><span><i className="community-dot" /> Communities <b>{mapCommunities.length}</b></span><span><i className="event-dot" /> Events <b>{mapEvents.length}</b></span></div></div>
    <div className="connectify-map"><MapContainer center={fallbackCenter} zoom={fallbackZoom} scrollWheelZoom={false} attributionControl={true}><TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' /><MapViewport points={points} fallbackCenter={fallbackCenter} fallbackZoom={fallbackZoom} />{mapCommunities.map((item) => <CircleMarker key={`community-${item.id}`} center={item.point} radius={8} pathOptions={{ color: '#b83b32', fillColor: '#dc574b', fillOpacity: 0.9, weight: 2 }} eventHandlers={{ click: () => onCommunity(item) }}><Popup><b>{item.name}</b><br />Community · {item.city}<br />Approximate listing area</Popup></CircleMarker>)}{mapEvents.map((item) => <CircleMarker key={`event-${item.id}`} center={item.point} radius={7} pathOptions={{ color: '#427d4d', fillColor: '#69b672', fillOpacity: 0.94, weight: 2 }} eventHandlers={{ click: () => onEvent(item) }}><Popup><b>{item.title}</b><br />Event · {item.place}<br />Approximate listing area</Popup></CircleMarker>)}</MapContainer></div>
  </section>
}

export function AuthDialog({ mode, onClose, onSuccess }) {
  const [kind, setKind] = useState(mode || 'register')
  const [accountType, setAccountType] = useState('member')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [interests, setInterests] = useState([])
  const [form, setForm] = useState({ fullName: '', email: '', password: '', city: 'Nashik', ageConfirmed: false })
  const [community, setCommunity] = useState({ name: '', category: 'Technology', state: '', district: '', city: '', mode: 'In person', schedule: '', venue: '', objectives: '', handlerName: '', capacity: '20', feeAmount: '0', discountCode: '' })
  const allInterests = ['Technology', 'Creative', 'Sports', 'Learning', 'Social impact', 'Lifestyle']
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const updateCommunity = (key, value) => setCommunity((current) => ({ ...current, [key]: value }))
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const communityPayload = { ...community, capacity: Number(community.capacity), feeAmount: Number(community.feeAmount), objectives: community.objectives.split('\n').map((line) => line.trim()).filter(Boolean) }
      const result = await send(kind === 'register' ? '/auth/register' : '/auth/login', kind === 'register' ? { ...form, city: accountType === 'community' ? community.city : form.city, interests, accountType, ...(accountType === 'community' ? { community: communityPayload } : {}) } : { email: form.email, password: form.password })
      onSuccess(result.user)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <div className="feature-backdrop" onClick={onClose}><section className="feature-modal auth-modal onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={(event) => event.stopPropagation()}><button className="feature-close" onClick={onClose} aria-label="Close"><X size={18} /></button><div className="feature-kicker"><span className="brand-mark"><span /><span /><span /></span> A LITTLE MORE CONNECTED</div><h2 id="auth-title">{kind === 'register' ? accountType === 'community' ? 'Bring your community here.' : 'Make room for good things.' : 'Good to see you again.'}</h2><p className="feature-subtitle">{kind === 'register' ? accountType === 'community' ? 'Create a host account and publish your community profile.' : 'Create your member account to find people, join communities, and register for events.' : 'Sign in to see your applications, event plans, and community connections.'}</p>
    {kind === 'register' && <div className="account-type-switch" role="group" aria-label="Choose account type"><button type="button" className={accountType === 'member' ? 'active' : ''} onClick={() => setAccountType('member')}><Users size={16} /><span><b>Join as a member</b><small>Find your people and events</small></span></button><button type="button" className={accountType === 'community' ? 'active' : ''} onClick={() => setAccountType('community')}><HeartHandshake size={16} /><span><b>Join as a community</b><small>Register your group as a host</small></span></button></div>}
    <form className="feature-form" onSubmit={submit}>
      {kind === 'register' && <label>Full name<input required minLength="2" maxLength="80" autoComplete="name" value={form.fullName} onChange={(event) => update('fullName', event.target.value)} placeholder="Your name" /></label>}
      <label>Email address<input required type="email" autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="you@example.com" /></label>
      <label>Password<input required type="password" minLength={kind === 'register' ? 10 : 1} autoComplete={kind === 'register' ? 'new-password' : 'current-password'} value={form.password} onChange={(event) => update('password', event.target.value)} placeholder={kind === 'register' ? 'At least 10 characters' : 'Your password'} /></label>
      {kind === 'register' && accountType === 'member' && <>
        <label>Your city<input required minLength="2" maxLength="80" value={form.city} onChange={(event) => update('city', event.target.value)} placeholder="City" /></label>
        <fieldset className="interest-field"><legend>What are you curious about?</legend><div className="interest-options">{allInterests.map((item) => <button type="button" key={item} className={interests.includes(item) ? 'interest-option active' : 'interest-option'} onClick={() => setInterests((items) => items.includes(item) ? items.filter((value) => value !== item) : [...items, item])}>{interests.includes(item) && <Check size={12} />}{item}</button>)}</div></fieldset>
        <label className="checkbox-row"><input type="checkbox" checked={form.ageConfirmed} onChange={(event) => update('ageConfirmed', event.target.checked)} /> <span>I confirm I meet the age and participation requirements of the communities and events I choose.</span></label>
      </>}
      {kind === 'register' && accountType === 'community' && <fieldset className="community-onboarding"><legend>Community details</legend><label>Community name<input required minLength="3" maxLength="100" value={community.name} onChange={(event) => updateCommunity('name', event.target.value)} placeholder="e.g. Nashik Weekend Coders" /></label><label>Category<select value={community.category} onChange={(event) => updateCommunity('category', event.target.value)}>{allInterests.map((item) => <option key={item}>{item}</option>)}</select></label><div className="form-pair"><label>State<input required value={community.state} onChange={(event) => updateCommunity('state', event.target.value)} /></label><label>District<input required value={community.district} onChange={(event) => updateCommunity('district', event.target.value)} /></label></div><div className="form-pair"><label>City or town<input required value={community.city} onChange={(event) => updateCommunity('city', event.target.value)} /></label><label>Who handles this community?<input required maxLength="80" value={community.handlerName} onChange={(event) => updateCommunity('handlerName', event.target.value)} placeholder="Host / community lead" /></label></div><div className="form-pair"><label>Meeting format<select value={community.mode} onChange={(event) => updateCommunity('mode', event.target.value)}><option>In person</option><option>Online</option><option>Hybrid</option></select></label><label>Meeting time or schedule<input required maxLength="160" value={community.schedule} onChange={(event) => updateCommunity('schedule', event.target.value)} placeholder="Saturdays, 10:00 AM" /></label></div><label>Venue<input required maxLength="160" value={community.venue} onChange={(event) => updateCommunity('venue', event.target.value)} placeholder="Venue name, address, or online" /></label><label>Community objectives<textarea required minLength="5" maxLength="1800" rows="4" value={community.objectives} onChange={(event) => updateCommunity('objectives', event.target.value)} placeholder="One objective per line: what does your group want to do?" /></label><div className="form-pair"><label>Available seats<input required type="number" min="1" max="500" value={community.capacity} onChange={(event) => updateCommunity('capacity', event.target.value)} /></label><label>Fee per member (₹)<input required type="number" min="0" max="100000" value={community.feeAmount} onChange={(event) => updateCommunity('feeAmount', event.target.value)} /></label></div><label>Discount code (optional)<input maxLength="40" value={community.discountCode} onChange={(event) => updateCommunity('discountCode', event.target.value)} placeholder="e.g. FIRSTMEET" /></label><label className="checkbox-row"><input type="checkbox" checked={form.ageConfirmed} onChange={(event) => update('ageConfirmed', event.target.checked)} /><span>I confirm I am at least 18 and the community details are accurate.</span></label></fieldset>}
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="button button-dark feature-submit" disabled={busy}>{busy ? 'Please wait…' : kind === 'register' ? accountType === 'community' ? 'Create host account & publish' : 'Create my account' : 'Sign in'} <ArrowRight size={16} /></button>
    </form>
    <p className="auth-switch">{kind === 'register' ? 'Already part of Connectify?' : 'New around here?'} <button onClick={() => { setKind(kind === 'register' ? 'login' : 'register'); setAccountType('member'); setError('') }}>{kind === 'register' ? 'Sign in' : 'Create an account'}</button></p>
    <small className="privacy-caption"><ShieldCheck size={13} /> Your email stays private and is never shown on your public profile.</small>
  </section></div>
}

function CommunityChat({ community, onBack }) {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef(null)
  useEffect(() => {
    let active = true
    const load = () => api(`/communities/${community.id}/chat`).then((rows) => { if (active) setMessages(rows) }).catch((err) => { if (active) setError(err.message) })
    load()
    const timer = window.setInterval(load, 10_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [community.id])
  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages.length])
  const submit = async (event) => {
    event.preventDefault(); if (!draft.trim()) return
    setBusy(true); setError('')
    try { const message = await send(`/communities/${community.id}/chat`, { message: draft }); setMessages((current) => [...current, message]); setDraft('') }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <div className="chat-content"><button className="back-link" onClick={onBack}><ArrowLeft size={14} /> Community details</button><div className="chat-heading"><div><h2>Member chat</h2><p>{community.name} · approved members only</p></div><span><Users size={15} /> private group</span></div><div className="chat-guidelines"><ShieldCheck size={17} /><div><b>Keep this space safe and private</b><p>Be respectful. Don’t post private email addresses, phone numbers, home addresses, or someone else’s personal details. Only share photos or work with permission. Chat is visible to approved community members.</p></div></div><div className="chat-log" aria-live="polite">{messages.length ? messages.map((message) => <article className={`chat-message ${message.mine ? 'mine' : ''}`} key={message.id}><span className="chat-avatar">{message.sender.fullName.slice(0, 1).toUpperCase()}</span><div><div className="chat-byline"><b>{message.sender.fullName}</b><time>{new Date(message.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</time></div><p>{message.message}</p></div></article>) : <div className="chat-empty"><MessageCircle size={25} /><b>Start with a friendly hello.</b><span>Share a question, a useful idea, or a plan for the next meetup.</span></div>}<div ref={bottomRef} /></div>{error && <div className="form-error" role="alert">{error}</div>}<form className="chat-compose" onSubmit={submit}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} rows={2} placeholder="Write a message…" aria-label="Write a message" /><button className="button button-dark" disabled={busy || !draft.trim()}>{busy ? 'Sending…' : 'Send'} <ArrowRight size={14} /></button></form><small className="chat-note">Messages are plain text. Email addresses and phone numbers are blocked by the server.</small></div>
}

export function CommunityDialog({ community, user, onClose, onEvent, notify, refresh, onAuth }) {
  const [mode, setMode] = useState('detail')
  const [answers, setAnswers] = useState({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [membershipStatus, setMembershipStatus] = useState('none')
  useEffect(() => {
    let active = true
    if (user) api(`/communities/${community.id}/membership`).then((data) => { if (active) setMembershipStatus(data.status) }).catch(() => {})
    else setMembershipStatus('none')
    return () => { active = false }
  }, [community.id, user?.id])
  const submit = async (kind) => {
    if (!user) return onAuth()
    const requiredAnswerCount = community.questions?.length || 2
    if (kind === 'apply' && Array.from({ length: requiredAnswerCount }, (_, index) => answers[index]).some((answer) => !answer?.trim())) return setError('Please answer each community question before sending your application.')
    setBusy(true); setError('')
    try {
      const result = kind === 'apply'
        ? await send(`/communities/${community.id}/applications`, { answers })
        : await send(`/communities/${community.id}/interest`, { message })
      notify(kind === 'apply' && result.status === 'pending' && result.approver ? `${result.message} Host reviewer: ${result.approver}.` : result.message); setMembershipStatus(result.status); refresh(); setMode('detail')
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <div className="feature-backdrop" onClick={onClose}><section className="feature-modal detail-modal" role="dialog" aria-modal="true" aria-labelledby="community-dialog-title" onClick={(event) => event.stopPropagation()}><button className="feature-close" onClick={onClose} aria-label="Close"><X size={18} /></button><div className={`detail-banner community-${community.tone}`}><span>{community.emoji}</span><b>{community.mode}</b></div>
    {mode === 'chat' ? <CommunityChat community={community} onBack={() => setMode('detail')} /> : mode === 'detail' ? <div className="detail-content"><div className="community-type"><span>{community.category}</span><i />{community.city} · {community.district}, {community.state}</div><h2 id="community-dialog-title">{community.name}</h2><p>{community.description}</p>
      <div className="detail-facts"><span><Clock3 size={16} /><span><small>MEETS</small>{community.schedule || 'Schedule shared by organizer'}</span></span><span><MapPin size={16} /><span><small>VENUE</small>{community.venue || community.city}</span></span><span><Users size={16} /><span><small>SPOTS LEFT</small>{community.spotsRemaining ?? 'Ask organizer'}</span></span><span><Heart size={16} /><span><small>FEES</small>{community.feeLabel || 'Ask organizer'}</span></span></div>
      {community.discountCode && <div className="community-discount"><b>Host discount</b><code>{community.discountCode}</code><small>Ask the host about eligibility and expiry.</small></div>}
      <div className="detail-objectives"><h3>What we’re here for</h3><ul>{(community.objectives || []).map((objective) => <li key={objective}><Check size={14} />{objective}</li>)}</ul><p><b>Who can join:</b> {community.eligibility || 'See community guidelines.'}</p>{community.rules?.length > 0 && <><h3>Community expectations</h3><ul>{community.rules.map((rule) => <li key={rule}><ShieldCheck size={14} />{rule}</li>)}</ul></>}</div>
      {community.nextEvent && <button className="next-event-callout" onClick={() => onEvent(community.nextEvent)}><CalendarDays size={19} /><span><small>UP NEXT · {community.nextEvent.date} · {community.nextEvent.time}</small><b>{community.nextEvent.title}</b><em>{community.nextEvent.place} · {community.nextEvent.feeLabel}</em></span><ArrowRight size={16} /></button>}
      {membershipStatus === 'approved' ? <><div className="member-status"><Check size={15} /> You’re an approved member of this community.</div><div className="detail-actions"><button className="button button-dark" onClick={() => setMode('chat')}><MessageCircle size={15} /> Open member chat</button></div></> : <><div className="detail-actions"><button className="button button-dark" disabled={membershipStatus === 'pending'} onClick={() => setMode(community.membershipMode === 'invite-only' ? 'interest' : 'apply')}>{membershipStatus === 'pending' ? 'Application pending' : membershipModeLabel(community)} <ArrowRight size={15} /></button><button className="button button-outline" onClick={() => setMode('interest')}><MessageCircle size={15} /> I’m interested</button></div>{community.membershipMode !== 'open' && <div className="application-review"><ShieldCheck size={16} /><span><b>{membershipStatus === 'pending' ? 'Your application is with' : 'Membership reviewed by'} {community.handlerName || 'the community organizing team'}</b><small>{membershipStatus === 'pending' ? 'This community host reviews membership requests.' : 'Your request will be sent to this community host.'}</small></span></div>}<small className="privacy-caption">{membershipStatus === 'pending' ? 'You can open the member chat after the host approves your application.' : community.membershipMode === 'open' ? 'Open membership is accepted automatically; member chat is available after joining.' : community.membershipMode === 'invite-only' ? 'Invite-only groups can receive an interest message.' : 'Your application is sent to the community host for review.'}</small></>}
    </div> : <div className="detail-content"><button className="back-link" onClick={() => { setMode('detail'); setError('') }}><ArrowLeft size={14} /> Community details</button><h2>{mode === 'apply' ? `Apply to ${community.name}` : `Message ${community.name}`}</h2><p>{mode === 'apply' ? 'Help the organizers get to know you. Your answers are private to the community team.' : 'Send a short message to let the organizers know you’re interested.'}</p>
      {mode === 'apply' ? <div className="feature-form">{(community.questions?.length ? community.questions : ['What brings you to this community?', 'What would you like to learn or contribute?']).map((question, index) => <label key={question}>{question}<textarea required minLength="2" maxLength="1000" rows="3" value={answers[index] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [index]: event.target.value }))} /></label>)}</div> : <label className="feature-form">Your message<textarea rows="5" minLength="10" maxLength="600" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Hi! I’d love to learn more about…" /></label>}
      {error && <div className="form-error" role="alert">{error}</div>}<button disabled={busy} className="button button-dark feature-submit" onClick={() => submit(mode === 'apply' ? 'apply' : 'interest')}>{busy ? 'Sending…' : mode === 'apply' ? 'Send application' : 'Send interest message'} <ArrowRight size={15} /></button>
    </div>}
  </section></div>
}

function membershipModeLabel(community) { return community.membershipMode === 'open' ? 'Join community' : community.membershipMode === 'invite-only' ? 'Ask about an invite' : 'Apply to join' }

export function EventDialog({ event, user, onClose, notify, onAuth, refresh }) {
  const [mode, setMode] = useState('detail')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [registration, setRegistration] = useState({ fullName: user?.fullName || '', email: user?.email || '', forWhom: 'myself', note: '', confirmEligibility: false })
  const [minutesBefore, setMinutesBefore] = useState('60')
  useEffect(() => { if (user) setRegistration((current) => ({ ...current, fullName: current.fullName || user.fullName, email: current.email || user.email })) }, [user?.id])
  const update = (key, value) => setRegistration((current) => ({ ...current, [key]: value }))
  const submit = async () => {
    if (!user) return onAuth()
    setBusy(true); setError('')
    try {
      const result = mode === 'register' ? await send(`/events/${event.id}/register`, registration) : await send(`/events/${event.id}/reminders`, { minutesBefore: Number(minutesBefore) })
      notify(result.message || 'Reminder saved in your calendar.'); refresh(); onClose()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <div className="feature-backdrop" onClick={onClose}><section className="feature-modal event-modal" role="dialog" aria-modal="true" aria-labelledby="event-dialog-title"><button className="feature-close" onClick={onClose} aria-label="Close"><X size={18} /></button><div className={`event-dialog-art community-${event.tone}`}><span>{event.emoji}</span></div>
    {mode === 'detail' ? <div className="detail-content"><div className="community-type"><span>{event.category}</span><i />{event.community}</div><h2 id="event-dialog-title">{event.title}</h2><p>{event.description}</p><div className="detail-facts"><span><CalendarDays size={16} /><span><small>WHEN</small>{event.date} · {event.time}</span></span><span><MapPin size={16} /><span><small>WHERE · {event.mode.toUpperCase()}</small>{event.place}</span></span><span><Users size={16} /><span><small>SPOTS REMAINING</small>{event.spots}</span></span><span><Heart size={16} /><span><small>FEES</small>{event.feeLabel || (event.feeAmount ? `₹${event.feeAmount}` : 'Free')}</span></span>{event.registrationDeadline && <span><Clock3 size={16} /><span><small>REGISTRATION CLOSES</small>{new Date(event.registrationDeadline).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}</span></span>}</div><div className="eligibility-note"><CircleHelp size={16} /><span><b>For whom:</b> {event.eligibility}. Registration asks who will attend so organizers can plan safely.</span></div><div className="detail-actions"><button className="button button-dark" disabled={event.spots === 0} onClick={() => setMode('register')}>{event.spots === 0 ? 'Full' : 'Register for event'} <ArrowRight size={15} /></button><button className="button button-outline" onClick={() => setMode('reminder')}><Bell size={15} /> Set a reminder</button></div><small className="privacy-caption">Any listed fee is paid to the organizer at the event; Connectify does not process payments.</small></div>
      : <div className="detail-content"><button className="back-link" onClick={() => { setMode('detail'); setError('') }}><ArrowLeft size={14} /> Event details</button><h2 id="event-dialog-title">{mode === 'register' ? 'Reserve your spot' : 'Add an event reminder'}</h2><p>{mode === 'register' ? `For ${event.title}. Required details go to the event organizer.` : 'Choose when Connectify should add an alert to your in-app notifications.'}</p>
        {mode === 'register' ? <div className="feature-form"><label>Attendee name<input required minLength="2" maxLength="80" value={registration.fullName} onChange={(e) => update('fullName', e.target.value)} /></label><label>Contact email<input required type="email" value={registration.email} onChange={(e) => update('email', e.target.value)} /><small>This is shared with the event organizer for event updates.</small></label><label>Who is this registration for?<select value={registration.forWhom} onChange={(e) => update('forWhom', e.target.value)}><option value="myself">Myself</option><option value="child-with-guardian">A child attending with a guardian</option><option value="someone-else">Someone else</option></select></label><label>Note for the organizer (optional)<textarea rows="3" maxLength="500" value={registration.note} onChange={(e) => update('note', e.target.value)} placeholder="Access needs or anything helpful to know" /></label><label className="checkbox-row"><input type="checkbox" checked={registration.confirmEligibility} onChange={(e) => update('confirmEligibility', e.target.checked)} /><span>I have read the eligibility and participation details above.</span></label></div> : <div className="feature-form"><label>Remind me<select value={minutesBefore} onChange={(e) => setMinutesBefore(e.target.value)}><option value="15">15 minutes before</option><option value="60">1 hour before</option><option value="1440">1 day before</option><option value="10080">1 week before</option></select></label><p className="reminder-note">We’ll create an in-app alert. Email and push reminders aren’t enabled yet.</p></div>}
        {error && <div className="form-error" role="alert">{error}</div>}<button disabled={busy} className="button button-dark feature-submit" onClick={submit}>{busy ? 'Saving…' : mode === 'register' ? 'Confirm registration' : 'Save reminder'} <Check size={15} /></button>
      </div>}
  </section></div>
}

export function CalendarSection({ onEvent, user, notify, onAuth, refreshKey, location }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [events, setEvents] = useState([])
  const [reminders, setReminders] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [busy, setBusy] = useState(false)
  const year = month.getFullYear(), monthNo = month.getMonth()
  const monthKey = `${year}-${String(monthNo + 1).padStart(2, '0')}`
  const locationQuery = new URLSearchParams(location).toString()
  useEffect(() => { api(`/calendar?month=${monthKey}&${locationQuery}`).then((data) => { setEvents(data.events); setReminders(data.reminders) }).catch(() => {}) }, [monthKey, user, refreshKey, location.state, location.district, location.city])
  const startOffset = new Date(year, monthNo, 1).getDay()
  const days = new Date(year, monthNo + 1, 0).getDate()
  const eventDays = useMemo(() => events.reduce((map, item) => { const day = new Date(item.startsAt).getDate(); map[day] = [...(map[day] || []), item]; return map }, {}), [events])
  const shift = (amount) => { setSelectedDay(null); setMonth(new Date(year, monthNo + amount, 1)) }
  const selectedEvents = selectedDay ? eventDays[selectedDay] || [] : []
  const setReminder = async (event) => {
    if (!user) return onAuth()
    setBusy(true)
    try { await send(`/events/${event.id}/reminders`, { minutesBefore: 60 }); const data = await api(`/calendar?month=${monthKey}&${locationQuery}`); setReminders(data.reminders); notify('One-hour event reminder saved.') }
    catch (error) { notify(error.message) } finally { setBusy(false) }
  }
  return <section className="planner-section section-shell" id="calendar"><div className="planner-heading"><div><div className="eyebrow eyebrow-muted">MAKE A PLAN</div><h2>Your month, <em>together.</em></h2><p>See what’s happening and save a quiet reminder for the things you don’t want to miss.</p></div><div className="planner-total"><CalendarDays size={18} /><span><b>{events.length}</b><small>events this month</small></span></div></div>
    <div className="calendar-layout"><div className="calendar-card"><div className="calendar-top"><button className="calendar-arrow" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button><h3>{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h3><button className="calendar-arrow" onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={18} /></button></div><div className="calendar-weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-days">{Array.from({ length: startOffset }, (_, index) => <span className="calendar-empty" key={`empty-${index}`} />)}{Array.from({ length: days }, (_, index) => { const day = index + 1; return <button key={day} className={`${eventDays[day] ? 'has-event' : ''} ${selectedDay === day ? 'day-selected' : ''}`} onClick={() => setSelectedDay(selectedDay === day ? null : day)}>{day}{eventDays[day] && <i />}</button> })}</div><div className="calendar-legend"><i /> Event on this day <span>{user ? `${reminders.length} saved reminders` : 'Sign in to save reminders'}</span></div></div>
      <div className="calendar-agenda"><div className="agenda-top"><span>{selectedDay ? month.toLocaleDateString('en-IN', { month: 'short' }) + ' ' + selectedDay : 'COMING UP'}</span><span>{selectedDay ? selectedEvents.length : events.length} {selectedDay ? 'events' : 'plans'}</span></div>{(selectedDay ? selectedEvents : events).length ? (selectedDay ? selectedEvents : events).map((event) => <article className="agenda-item" key={event.id}><span className={`agenda-emoji community-${event.tone}`}>{event.emoji}</span><div><small>{event.date} · {event.time}</small><b>{event.title}</b><span><MapPin size={12} />{event.place}</span></div><div className="agenda-actions"><button title="View event" onClick={() => onEvent(event)}><Compass size={15} /></button><button disabled={busy} title="Set 1-hour reminder" onClick={() => setReminder(event)}><Bell size={15} /></button></div></article>) : <div className="agenda-empty"><CalendarDays size={22} /><p>No events on that day yet.</p><button onClick={() => setSelectedDay(null)}>See all this month</button></div>}{!selectedDay && events.length > 0 && <small className="agenda-footnote">Select a dotted date to see that day’s plans.</small>}</div></div>
  </section>
}

export function ConnectSection({ user, onAuth, notify, followers, refreshFollowers }) {
  const [people, setPeople] = useState([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('discover')
  useEffect(() => { if (user) api(`/people?search=${encodeURIComponent(search)}`).then(setPeople).catch(() => setPeople([])) }, [user, search])
  const follow = async (person) => {
    if (!user) return onAuth()
    try {
      if (person.following) { await send(`/people/${person.id}/follow`, {}, 'DELETE'); setPeople((items) => items.map((item) => item.id === person.id ? { ...item, following: false } : item)); notify(`You unfollowed ${person.fullName}.`) }
      else { await send(`/people/${person.id}/follow`, {}); setPeople((items) => items.map((item) => item.id === person.id ? { ...item, following: true } : item)); notify(`You’re now following ${person.fullName}.`) }
      refreshFollowers()
    }
    catch (error) { notify(error.message) }
  }
  const showList = tab === 'followers' ? followers?.followers || [] : tab === 'following' ? followers?.following || [] : people
  return <section className="connect-section" id="connect"><div className="section-shell"><div className="connect-heading"><div><div className="eyebrow eyebrow-light">A FEW PEOPLE TO MEET</div><h2>Find your <em>people.</em></h2><p>Meet people nearby through shared interests. Your email stays private; only your basic profile details appear here.</p></div><div className="connect-art"><Users size={31} /><span>✳</span></div></div>
    <div className="people-toolbar"><div className="people-tabs"><button className={tab === 'discover' ? 'active' : ''} onClick={() => setTab('discover')}>Discover</button><button className={tab === 'followers' ? 'active' : ''} onClick={() => { if (!user) return onAuth(); setTab('followers') }}>Followers</button><button className={tab === 'following' ? 'active' : ''} onClick={() => { if (!user) return onAuth(); setTab('following') }}>Following</button></div>{tab === 'discover' && <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, city, interest…" aria-label="Search people" />}</div>
    {!user && <div className="sign-in-hint"><ShieldCheck size={16} /> Create an account to discover people and manage your followers. <button onClick={onAuth}>Join Connectify <ArrowRight size={14} /></button></div>}
    {user && <div className="people-grid">{showList.length ? showList.map((person) => <article className="person-card" key={person.id}><div className="person-avatar">{person.fullName.slice(0, 1).toUpperCase()}</div><div className="person-card-head"><div><h3>{person.fullName}</h3><span><MapPin size={12} />{person.city}</span></div><button className={`follow-button ${person.following ? 'is-following' : ''}`} onClick={() => follow(person)}>{person.following ? <><Check size={13} /> Following</> : <><Heart size={13} /> Follow</>}</button></div>{person.matchSummary && <small className="match-summary">✳ {person.matchSummary}</small>}<p>{person.bio || 'Here to find good people and learn something new.'}</p><div className="person-tags">{[...(person.interests || []), ...(person.skills || [])].slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}</div></article>) : <div className="people-empty"><Users size={25} /><b>{tab === 'discover' ? 'Your people are joining.' : `No ${tab} yet.`}</b><span>{tab === 'discover' ? 'More profiles will appear as members create accounts and choose to be discoverable.' : 'Follow a few people to get started.'}</span></div>}</div>}
  </div></section>
}

export function VolunteerSection({ user, onAuth, notify, refresh }) {
  const [form, setForm] = useState({ fullName: user?.fullName || '', email: user?.email || '', phone: '', motive: '', ideas: '', availability: '', privacyConsent: false })
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => setForm((current) => ({ ...current, fullName: user?.fullName || '', email: user?.email || '' })), [user])
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const submit = async (event) => { event.preventDefault(); if (!user) return onAuth(); setBusy(true); setError(''); try { await send('/volunteer-applications', form); setSent(true); notify('Your volunteer interest has been recorded.'); refresh() } catch (err) { setError(err.message) } finally { setBusy(false) } }
  return <section className="volunteer-section section-shell" id="volunteer"><div className="volunteer-copy"><div className="eyebrow eyebrow-muted">A LITTLE HELP GOES A LONG WAY</div><h2>Put your ideas<br />to <em>good use.</em></h2><p>Tell a local organizer what you care about and how you’d like to help. Your contact details go only to the team reviewing this volunteer interest form.</p><div className="volunteer-promise"><span><Check size={15} /> Share your motive</span><span><Check size={15} /> Bring your ideas</span><span><Check size={15} /> Choose how to help</span></div><small><ShieldCheck size={14} /> Your email and optional phone are private to the reviewing organizer.</small></div>
    <div className="volunteer-form-card"><div className="volunteer-form-heading"><span>✳</span><div><b>Volunteer interest</b><small>A simple first hello</small></div></div>{sent ? <div className="success-card"><Check size={25} /><h3>Thanks for showing up.</h3><p>Your volunteer details were recorded. You can keep an eye on your alerts for updates.</p><button onClick={() => setSent(false)}>Send another response</button></div> : <form className="feature-form" onSubmit={submit}><div className="form-pair"><label>Your name<input required minLength="2" maxLength="80" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} /></label><label>Contact email<input required type="email" maxLength="160" value={form.email} onChange={(e) => update('email', e.target.value)} /></label></div><label>Phone (optional)<input type="tel" maxLength="30" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="Only if you want a call or text" /></label><label>What motivates you to volunteer?<textarea required minLength="20" maxLength="1000" rows="3" value={form.motive} onChange={(e) => update('motive', e.target.value)} placeholder="Tell us what matters to you…" /></label><label>What ideas would you like to bring?<textarea required minLength="10" maxLength="1000" rows="3" value={form.ideas} onChange={(e) => update('ideas', e.target.value)} placeholder="A project, a skill, or a small first step…" /></label><label>When are you usually available? (optional)<input maxLength="200" value={form.availability} onChange={(e) => update('availability', e.target.value)} placeholder="Weekends, evenings, one-off events…" /></label><label className="checkbox-row"><input type="checkbox" checked={form.privacyConsent} onChange={(e) => update('privacyConsent', e.target.checked)} /><span>I agree that the reviewing organizer may use my contact details to respond to this volunteer interest.</span></label>{error && <div className="form-error">{error}</div>}<button className="button button-dark feature-submit" disabled={busy}>{busy ? 'Sending…' : 'Send volunteer interest'} <ArrowRight size={15} /></button></form>}</div></section>
}

export function ProfileSection({ user, onAuth, onUpdate, notify, followers, activity, hostedCommunity }) {
  const [form, setForm] = useState({ fullName: '', city: '', interests: [], skills: [], bio: '', discoverable: true })
  const [skillInput, setSkillInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (user) setForm({ fullName: user.fullName, city: user.city, interests: user.interests || [], skills: user.skills || [], bio: user.bio || '', discoverable: user.discoverable !== false }) }, [user])
  if (!user) return <section className="profile-section section-shell" id="profile"><div className="profile-empty"><div className="profile-avatar">✳</div><div><div className="eyebrow eyebrow-muted">YOUR PLACE IN THE COMMUNITY</div><h2>Start with <em>your story.</em></h2><p>Create your account to keep your profile, communities, applications, and event plans together.</p><button className="button button-dark" onClick={onAuth}>Create my account <ArrowRight size={15} /></button></div></div></section>
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(''); try { const result = await send('/profile', form, 'PATCH'); onUpdate(result.user); notify('Your profile is saved.') } catch (err) { setError(err.message) } finally { setBusy(false) } }
  const addSkill = () => { const skill = skillInput.trim(); if (skill && !form.skills.includes(skill) && form.skills.length < 20) setForm((current) => ({ ...current, skills: [...current.skills, skill] })); setSkillInput('') }
  const points = (activity?.applications || []).filter((item) => item.status === 'approved').length * 100 + (activity?.registrations || []).filter((item) => item.status !== 'cancelled').length * 25 + (activity?.volunteer || []).length * 50
  const ranks = [{ name: 'Bronze', floor: 0 }, { name: 'Gold', floor: 100 }, { name: 'Platinum', floor: 300 }, { name: 'Diamond', floor: 600 }]
  const rankIndex = Math.max(0, ranks.findLastIndex((rank) => points >= rank.floor))
  const rank = ranks[rankIndex], nextRank = ranks[rankIndex + 1]
  const progress = nextRank ? Math.min(100, Math.round(((points - rank.floor) / (nextRank.floor - rank.floor)) * 100)) : 100
  return <section className="profile-section section-shell" id="profile"><div className="dashboard-title"><div><div className="eyebrow eyebrow-muted">YOUR CONNECTIFY DASHBOARD</div><h2>Your people. <em>Your progress.</em></h2></div><span className="dashboard-role">{user.role === 'communityAdmin' ? <><HeartHandshake size={14} /> Community host</> : <><Users size={14} /> Member account</>}</span></div><div className="profile-heading"><div className="profile-avatar">{user.fullName.slice(0, 1).toUpperCase()}</div><div><div className="eyebrow eyebrow-muted">YOUR PROFILE</div><h2>{user.fullName}</h2><span className="profile-email"><ShieldCheck size={13} /> {user.email} · private</span><span className="profile-city"><MapPin size={12} /> {user.city}</span></div><div className="profile-counts"><span><b>{followers?.followers?.length || 0}</b> followers</span><span><b>{followers?.following?.length || 0}</b> following</span><span><b>{activity?.applications?.length || 0}</b> requests</span></div></div>
    <div className="citizenship-card"><div className={`citizenship-medal rank-${rank.name.toLowerCase()}`}><Award size={25} /><span>{rank.name.slice(0, 1)}</span></div><div className="citizenship-info"><div className="citizenship-kicker">CONNECTIFY CITIZENSHIP</div><h3>{rank.name} member <span>{points} pts</span></h3><p>{nextRank ? `${nextRank.floor - points} points until ${nextRank.name}` : 'You reached the highest current rank.'} Points grow as you join communities, attend events, and volunteer.</p><div className="rank-progress"><i style={{ width: `${progress}%` }} /></div><div className="rank-ladder">{ranks.map((item, index) => <span className={index <= rankIndex ? 'reached' : ''} key={item.name}>{item.name}</span>)}</div></div><div className="host-perks"><LockKeyhole size={17} /><b>Host perks</b><small>Special features will unlock as community hosts release them.</small><span>COMING SOON</span></div></div>
    {hostedCommunity && <div className={`host-review-card status-${hostedCommunity.status}`}><span className="host-review-icon"><HeartHandshake size={17} /></span><span><b>{hostedCommunity.name}</b><small>{hostedCommunity.city}, {hostedCommunity.state} · hosted by {hostedCommunity.handlerName}</small></span><em>{hostedCommunity.status === 'approved' ? 'Live' : hostedCommunity.status === 'pending' ? 'Under review' : hostedCommunity.status}</em></div>}
    <form className="profile-edit feature-form" onSubmit={submit}><div className="form-pair"><label>Display name<input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label><label>City<input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label></div><label>About you<textarea rows="3" maxLength="400" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="A little about what you enjoy…" /></label><div className="profile-tags-field"><span>Interests</span><div>{form.interests.map((item) => <i key={item}>{item}<button type="button" onClick={() => setForm({ ...form, interests: form.interests.filter((tag) => tag !== item) })} aria-label={`Remove ${item}`}><X size={11} /></button></i>)}</div><select aria-label="Add an interest" value="" onChange={(e) => { const value = e.target.value; if (value && !form.interests.includes(value)) setForm((current) => ({ ...current, interests: [...current.interests, value] })) }}><option value="">Add an interest…</option>{['Technology', 'Creative', 'Sports', 'Learning', 'Social impact', 'Lifestyle'].filter((item) => !form.interests.includes(item)).map((item) => <option key={item}>{item}</option>)}</select></div><label>Add a skill<input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }} placeholder="Type a skill and press Enter" /></label><div className="profile-tags-field"><span>Skills</span><div>{form.skills.map((item) => <i key={item}>{item}<button type="button" onClick={() => setForm({ ...form, skills: form.skills.filter((tag) => tag !== item) })} aria-label={`Remove ${item}`}><X size={11} /></button></i>)}</div></div><label className="checkbox-row discoverable-row"><input type="checkbox" checked={form.discoverable} onChange={(e) => setForm({ ...form, discoverable: e.target.checked })} /><span><b>Show me in people discovery</b><small>You can turn this off at any time. Your email is never public.</small></span></label>{error && <div className="form-error">{error}</div>}<button className="button button-dark" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save profile'} <Check size={15} /></button></form></section>
}

export function HostDashboard({ user, notify }) {
  const [dashboard, setDashboard] = useState(null)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const load = () => api('/host/dashboard').then(setDashboard).catch((err) => setError(err.message))
  useEffect(() => { if (user?.role === 'communityAdmin') load(); else setDashboard(null) }, [user?.id, user?.role])
  if (!user || user.role !== 'communityAdmin' || !dashboard?.community) return null
  const review = async (application, status) => {
    setBusyId(application.id); setError('')
    try { await send(`/host/applications/${application.id}/status`, { status }); notify(status === 'approved' ? `${application.fullName} is now a member.` : `You declined ${application.fullName}’s request.`); await load() }
    catch (err) { setError(err.message) } finally { setBusyId('') }
  }
  return <section className="host-dashboard section-shell" id="host-dashboard"><div className="host-dashboard-heading"><div><div className="eyebrow eyebrow-muted">COMMUNITY HOST TOOLS</div><h2>{dashboard.community.name}</h2><p>Review membership requests and decide who can join your community.</p></div><span className={`host-state state-${dashboard.community.status}`}>{dashboard.community.status === 'approved' ? 'Community is live' : 'Listing under review'}</span></div>
    {dashboard.community.status === 'pending' ? <div className="host-pending"><LockKeyhole size={20} /><div><b>Connectify is reviewing this listing</b><span>Membership requests open after the community is approved. This starter build doesn’t include the Connectify listing-review controls yet.</span></div></div> : <><div className="host-queue-summary"><b>{dashboard.applications.filter((item) => item.status === 'pending').length}</b> requests waiting for your review <span>{dashboard.applications.length} total</span></div>{error && <div className="form-error">{error}</div>}{dashboard.applications.length ? <div className="host-application-list">{dashboard.applications.map((application) => <article className="host-application" key={application.id}><div className="host-applicant-avatar">{application.fullName.slice(0, 1).toUpperCase()}</div><div className="host-applicant-info"><div className="host-applicant-title"><b>{application.fullName}</b><span>{application.city}</span><em className={`status-${application.status}`}>{application.status}</em></div>{application.interests.length > 0 && <small>Interests: {application.interests.join(', ')}</small>}{Object.values(application.answers || {}).filter(Boolean).map((answer, index) => <p key={`${application.id}-${index}`}>{answer}</p>)}<time>{new Date(application.createdAt).toLocaleDateString('en-IN')}</time></div>{application.status === 'pending' && <div className="host-review-actions"><button disabled={busyId === application.id} onClick={() => review(application, 'approved')}><Check size={14} /> Approve</button><button disabled={busyId === application.id} onClick={() => review(application, 'rejected')}><X size={14} /> Decline</button></div>}</article>)}</div> : <div className="host-empty"><Users size={22} /><b>No membership requests yet</b><span>New applications will appear here.</span></div>}</>}
  </section>
}

export function GuidelinesSection() {
  const rules = [
    ['Be kind and make room', 'Treat members with respect. Welcome people who are new, and give everyone room to participate at their own pace.'],
    ['Keep personal details private', 'Do not publish someone’s private email, phone, home address, or identifying information without their permission.'],
    ['Meet safely', 'Check event details before attending. Choose public venues, tell someone you trust about your plan, and respect age and guardian requirements.'],
    ['Be clear about fees', 'Organizers must describe any fee before registration. Connectify does not collect or process event payments.'],
    ['No harassment or discrimination', 'Threats, hate, unwanted contact, and discriminatory behavior are not allowed. Report concerns so they can be reviewed.'],
    ['Represent organizations honestly', 'Only organizations verified by the platform may be shown as verified. Do not request donations under an unverified identity.'],
  ]
  return <section className="guidelines-section" id="guidelines"><div className="section-shell guidelines-shell"><div><div className="eyebrow eyebrow-muted">HOW WE LOOK AFTER EACH OTHER</div><h2>Community <em>guidelines.</em></h2><p>A good community makes it easier for people to take part, feel safe, and trust what they see.</p></div><div className="guidelines-grid">{rules.map(([title, body], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{body}</p></article>)}</div><small><ShieldCheck size={14} /> If someone may be in immediate danger, contact local emergency services first. Connectify reports can then be reviewed through platform moderation.</small></div></section>
}

export function AlertsPanel({ items, onClose, onRead }) {
  return <div className="alerts-backdrop" onClick={onClose}><aside className="alerts-panel" onClick={(event) => event.stopPropagation()}><div className="alerts-heading"><div><div className="eyebrow eyebrow-muted">YOUR UPDATES</div><h2>Alerts</h2></div><button className="feature-close" onClick={onClose} aria-label="Close alerts"><X size={18} /></button></div>{items.length ? items.map((item) => <button className={`alert-item ${item.read ? 'read' : ''}`} key={item.id} onClick={() => onRead(item)}><span className="alert-icon"><Bell size={16} /></span><span><b>{item.title}</b><small>{item.body}</small><time>{new Date(item.createdAt).toLocaleString()}</time></span>{!item.read && <i />}</button>) : <div className="alerts-empty"><Bell size={24} /><b>All quiet for now.</b><span>Applications, event signups, and reminders will show up here.</span></div>}</aside></div>
}
