import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, Bell, CalendarDays, Check, Compass, Heart, HeartHandshake, MapPin, Menu, Search, ShieldCheck, Sparkles, Users, X } from 'lucide-react'
import { api, send } from './api.js'
import { AlertsPanel, AuthDialog, CalendarSection, CommunityDialog, ConnectSection, DiscoveryMap, EventDialog, GuidelinesSection, HostDashboard, LocationPicker, ProfileSection, VolunteerSection } from './Features.jsx'

const categories = ['All', 'Technology', 'Creative', 'Sports', 'Learning', 'Social impact', 'Lifestyle']
const interestKeywords = [
  { term: 'photography', category: 'Creative' }, { term: 'photo walk', category: 'Creative' },
  { term: 'coding', category: 'Technology' }, { term: 'programming', category: 'Technology' },
  { term: 'books', category: 'Learning' }, { term: 'reading', category: 'Learning' },
  { term: 'volunteering', category: 'Social impact' }, { term: 'environment', category: 'Social impact' },
  { term: 'cleanup', category: 'Social impact' }, { term: 'repair', category: 'Lifestyle' },
  { term: 'makers', category: 'Technology' }, { term: 'running', category: 'Sports' },
  { term: 'marathi', category: 'Learning' }, { term: 'board games', category: 'Lifestyle' },
  { term: 'design', category: 'Creative' }, { term: 'community kitchen', category: 'Social impact' },
  { term: 'art', category: 'Creative' }, { term: 'music', category: 'Creative' },
  { term: 'crafts', category: 'Creative' }, { term: 'outdoors', category: 'Sports' },
  { term: 'wellness', category: 'Lifestyle' }, { term: 'cooking', category: 'Lifestyle' },
  { term: 'sustainability', category: 'Social impact' }, { term: 'gardening', category: 'Social impact' },
  { term: 'robotics', category: 'Technology' }, { term: 'language exchange', category: 'Learning' },
]

function Brand({ light = false }) {
  return <a className={`brand ${light ? 'brand-light' : ''}`} href="#home" aria-label="Connectify home"><span className="brand-mark"><span /><span /><span /></span><span>connectify<span className="brand-dot">.</span></span></a>
}

function App() {
  const [communities, setCommunities] = useState([])
  const [events, setEvents] = useState([])
  const [city, setCity] = useState('Nashik')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [location, setLocation] = useState({ state: 'Maharashtra', district: 'Nashik', city: 'Nashik' })
  const [category, setCategory] = useState('All')
  const [apiStatus, setApiStatus] = useState('checking')
  const [selected, setSelected] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [notice, setNotice] = useState('')
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('')
  const [showAlerts, setShowAlerts] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [followers, setFollowers] = useState({ followers: [], following: [] })
  const [activity, setActivity] = useState({ applications: [], interests: [], registrations: [], volunteer: [] })
  const [hostedCommunity, setHostedCommunity] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const locationQuery = new URLSearchParams(location).toString()

  useEffect(() => {
    fetch(`/api/discovery?${locationQuery}`).then((response) => {
      if (!response.ok) throw new Error('API unavailable')
      return response.json()
    }).then((data) => {
      setCommunities(data.communities)
      setEvents(data.events)
      setCity(data.location.city || data.location.district || data.location.state || data.city)
      setApiStatus('ready')
    }).catch(() => setApiStatus('offline'))
  }, [location.state, location.district, location.city])

  useEffect(() => {
    api('/auth/me').then((data) => { setUser(data.user); setCity(data.user.city); setLocation({ state: '', district: '', city: data.user.city }) }).catch(() => setUser(null))
  }, [])

  const refreshMemberData = () => {
    api(`/discovery?${locationQuery}`).then((data) => { setCommunities(data.communities); setEvents(data.events) }).catch(() => {})
    setRefreshKey((key) => key + 1)
    if (!user) return
    api('/notifications').then(setNotifications).catch(() => {})
    api('/followers').then(setFollowers).catch(() => {})
    api('/my-community').then(setHostedCommunity).catch(() => setHostedCommunity(null))
    Promise.all([api('/applications'), api('/interest-requests'), api('/registrations'), api('/volunteer-applications')])
      .then(([applications, interests, registrations, volunteer]) => setActivity({ applications, interests, registrations, volunteer }))
      .catch(() => {})
  }

  useEffect(() => { refreshMemberData() }, [user?.id])

  const visibleCommunities = useMemo(() => communities.filter((item) => {
    const query = search.toLowerCase()
    const matchesText = !query || `${item.name} ${item.description} ${item.category} ${item.city} ${item.state} ${item.district}`.toLowerCase().includes(query) || events.some((event) => event.communityId === item.id && `${event.title} ${event.description} ${event.category}`.toLowerCase().includes(query))
    return matchesText && (category === 'All' || item.category === category)
  }), [communities, events, search, category])

  const visibleEvents = useMemo(() => events.filter((event) => (category === 'All' || event.category === category) && (!search || `${event.title} ${event.description} ${event.community} ${event.category} ${event.place}`.toLowerCase().includes(search.toLowerCase()))), [events, search, category])

  const suggestions = useMemo(() => {
    const query = searchInput.trim().toLowerCase()
    if (!query) return []
    const catalog = [
      ...communities.map((item) => ({ type: 'Community', label: item.name, detail: `${item.category} · ${item.city}`, query: item.name, category: item.category, haystack: `${item.name} ${item.description} ${item.category} ${item.city}` })),
      ...events.map((item) => ({ type: 'Event', label: item.title, detail: `${item.category} · ${item.community}`, query: item.title, category: 'All', haystack: `${item.title} ${item.description} ${item.category} ${item.community}` })),
      ...categories.filter((item) => item !== 'All').map((item) => ({ type: 'Interest', label: item, detail: 'Browse this interest', query: item, category: item, haystack: item })),
      ...interestKeywords.map((item) => ({ type: 'Keyword', label: item.term, detail: `${item.category} interest`, query: item.term, category: item.category, haystack: item.term })),
    ]
    const matches = catalog.map((item) => ({ ...item, score: item.label.toLowerCase().startsWith(query) ? 3 : item.label.toLowerCase().includes(query) ? 2 : item.haystack.toLowerCase().includes(query) ? 1 : 0 })).filter((item) => item.score > 0)
    const unique = [...new Map(matches.sort((a, b) => b.score - a.score).map((item) => [`${item.type}:${item.label}`, item])).values()]
    return unique.slice(0, 7)
  }, [communities, events, searchInput])

  const showNotice = (message) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3200)
  }
  const runSearch = () => {
    setSearch(searchInput.trim())
    setShowSuggestions(false)
    document.getElementById('communities')?.scrollIntoView({ behavior: 'smooth' })
  }
  const chooseSuggestion = (item) => {
    setSearchInput(item.query)
    setSearch(item.query)
    setCategory(item.category || 'All')
    setShowSuggestions(false)
  }
  const openCommunity = (community) => {
    api(`/communities/${community.id}`).then(setSelected).catch(() => setSelected(community))
  }

  return <>
    <header className="topbar" id="home">
      <div className="nav-shell">
        <Brand />
        <button className="mobile-toggle icon-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle navigation">{mobileMenu ? <X /> : <Menu />}</button>
        <nav className={`main-nav ${mobileMenu ? 'nav-open' : ''}`} aria-label="Main navigation">
          <a className="nav-link active" href="#home" onClick={() => setMobileMenu(false)}>Home</a>
          {user && <a className="nav-link" href="#profile" onClick={() => setMobileMenu(false)}>Dashboard</a>}
          <a className="nav-link" href="#communities" onClick={() => setMobileMenu(false)}>Explore</a>
          <a className="nav-link" href="#communities" onClick={() => setMobileMenu(false)}>Communities</a>
          <a className="nav-link" href="#events" onClick={() => setMobileMenu(false)}>Events</a>
          <a className="nav-link" href="#calendar" onClick={() => setMobileMenu(false)}>Calendar</a>
          <a className="nav-link" href="#connect" onClick={() => setMobileMenu(false)}>Connect</a>
          <a className="nav-link" href="#volunteer" onClick={() => setMobileMenu(false)}>Volunteer</a>
          <a className="nav-link" href="#guidelines" onClick={() => setMobileMenu(false)}>Guidelines</a>
        </nav>
        <div className="nav-actions">
          {user && <button className="icon-button notification-button" aria-label="Notifications" onClick={() => { setShowAlerts(true); api('/notifications').then(setNotifications).catch(() => {}) }}><Bell size={19} />{notifications.some((item) => !item.read) && <i />}</button>}
          {user ? <button className="profile-nav" onClick={() => document.getElementById('profile')?.scrollIntoView({ behavior: 'smooth' })}><span>{user.fullName.slice(0, 1).toUpperCase()}</span><b>{user.fullName.split(' ')[0]}<small>My dashboard</small></b></button> : <button className="button button-dark nav-join" onClick={() => setAuthMode('register')}>Join Connectify <ArrowRight size={16} /></button>}
        </div>
      </div>
    </header>

    <main>
      <section className="hero-section">
        <div className="hero-grid" />
        <div className="hero-content">
          <div className="eyebrow"><span className="live-dot" /> YOUR CITY, A LITTLE CLOSER</div>
          <h1>Find your people.<br /><span>Make things happen.</span></h1>
          <p className="hero-copy">Good things happen when curious people come together. Find a community, try something new, and feel more at home where you live.</p>
          <div className="hero-search-wrap">
            <div className="search-block-label"><span>01</span><div><b>Search by interest</b><small>Find communities, events, and activities</small></div></div>
            <div className="hero-search">
              <Search size={19} className="search-icon" />
              <input value={searchInput} onFocus={() => setShowSuggestions(true)} onChange={(event) => { setSearchInput(event.target.value); setShowSuggestions(true) }} onKeyDown={(event) => { if (event.key === 'Enter') runSearch(); if (event.key === 'Escape') setShowSuggestions(false) }} placeholder="Try photography, coding, running..." aria-label="Search communities, interests, and events" aria-expanded={showSuggestions && Boolean(searchInput.trim())} />
              <button onClick={runSearch}>Explore <ArrowRight size={16} /></button>
            </div>
            {showSuggestions && searchInput.trim() && <div className="search-suggestions" role="listbox" aria-label="Search suggestions">{suggestions.length ? suggestions.map((item) => <button type="button" key={`${item.type}-${item.label}`} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseSuggestion(item)}><span className="suggestion-icon">{item.type === 'Community' ? '◉' : item.type === 'Event' ? '▣' : item.type === 'Interest' ? '✳' : '⌕'}</span><span><b>{item.label}</b><small>{item.detail}</small></span><em>{item.type}</em></button>) : <div className="no-suggestions">No exact matches yet. Explore to search this city’s listings.</div>}<button className="search-all" onMouseDown={(event) => event.preventDefault()} onClick={runSearch}><Search size={14} /> Search for “{searchInput.trim()}” <ArrowRight size={14} /></button></div>}
          </div>
          <div className="hero-place-search"><div className="search-block-label"><span>02</span><div><b>Search by location</b><small>Choose a city, district, or state</small></div></div><LocationPicker value={location} onApply={(next) => { setLocation(next); setCity(next.city || next.district || next.state); showNotice(`Showing listings for ${next.city || next.district || next.state}.`) }} /></div>
          <div className="hero-meta"><span><MapPin size={15} /> Places to explore around {location.city || location.district || location.state}</span><span className="meta-divider" /> <span className="people-avatars"><i>R</i><i>A</i><i>M</i><b>neighbors</b></span><span className="meta-caption">finding their thing</span></div>
        </div>
        <div className="hero-art" aria-label="Illustration of neighbors connecting">
          <div className="art-sun" />
          <div className="art-circle circle-one" /><div className="art-circle circle-two" />
          <div className="art-card card-note"><Sparkles size={15} /><span>your next<br /><b>good thing</b></span><ArrowUpRight size={16} /></div>
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="person person-left"><div className="person-head hair-a"><i /></div><div className="person-body body-a" /></div>
          <div className="person person-right"><div className="person-head hair-b"><i /></div><div className="person-body body-b" /></div>
          <div className="person person-back"><div className="person-head hair-c"><i /></div><div className="person-body body-c" /></div>
          <div className="art-ground" />
          <div className="art-card card-event"><span className="event-mini-icon">✳</span><span><b>Sunday makers</b><small>12 people · 10 am</small></span><span className="event-arrow"><ArrowUpRight size={14} /></span></div>
          <div className="floating-star star-a">✳</div><div className="floating-star star-b">✳</div>
        </div>
        <a href="#communities" className="scroll-cue"><span>SCROLL TO EXPLORE</span><ArrowDown size={15} /></a>
        <div className="hero-footnote"><span>01 / 03</span><span className="footnote-line" /><span>COMMUNITY STARTS HERE</span></div>
      </section>

      <DiscoveryMap communities={communities} events={events} location={location} onCommunity={openCommunity} onEvent={setSelectedEvent} />

      <section className="intro-strip"><div className="strip-inner"><p><span className="strip-star">✳</span> Less scrolling. <b>More showing up.</b></p><div className="strip-stats"><span><b>{String(communities.length).padStart(2, '0')}</b> communities</span><i /> <span><b>{String(events.length).padStart(2, '0')}</b> things happening</span><i /> <span><b>1</b> city to start</span></div></div></section>

      <section className="discover-section section-shell" id="communities">
        <div className="section-heading"><div><div className="eyebrow eyebrow-muted">A PLACE TO BEGIN</div><h2>Find a corner<br />that feels like <em>yours.</em></h2></div><p className="section-lede">Small groups, shared interests, and a reason to get out the door. There’s a community for the thing you already love—and the thing you’re about to.</p></div>
        <div className="explore-toolbar"><div className="category-list" role="group" aria-label="Filter communities by category">{categories.map((item) => <button key={item} className={`category-chip ${category === item ? 'selected' : ''}`} onClick={() => setCategory(item)}>{item}</button>)}</div><span className="result-count"><b className="preview-pill">Preview listings</b>{visibleCommunities.length} communities to explore <ArrowDown size={14} /></span></div>
        <div className="community-grid">
          {visibleCommunities.map((item, index) => <article className={`community-card community-${item.tone}`} key={item.id}>
            <div className="community-visual"><span className="community-index">0{index + 1}</span><div className="community-emoji">{item.emoji}</div><span className="community-mode">{item.mode}</span><button aria-label={`View ${item.name}`} className="round-arrow" onClick={() => openCommunity(item)}><ArrowUpRight size={18} /></button><div className="visual-decoration decor-a" /><div className="visual-decoration decor-b" /></div>
            <div className="community-body"><div className="community-type"><span>{item.category}</span><span className="type-dot" />{item.city}</div><h3>{item.name}</h3><p>{item.description}</p><div className="community-footer"><span className="member-stack"><i>J</i><i>S</i><i>A</i></span><span>{item.members} members</span><button onClick={() => openCommunity(item)}>Meet the community <ArrowRight size={14} /></button></div></div>
          </article>)}
          {visibleCommunities.length === 0 && <div className="empty-state"><span>🔎</span><h3>No groups found just yet</h3><p>Try a different search or choose another interest.</p><button onClick={() => { setSearch(''); setCategory('All') }}>Clear filters</button></div>}
        </div>
        <div className="center-action"><button className="button button-outline" onClick={() => showNotice('More communities are being added as Connectify grows.')}>Explore all communities <ArrowRight size={16} /></button></div>
      </section>

      <section className="events-section" id="events"><div className="section-shell events-shell"><div className="events-head"><div><div className="eyebrow eyebrow-light">A GOOD REASON TO GET OUT</div><h2>It’s better <em>together.</em></h2></div><button className="text-link light-link" onClick={() => document.getElementById('calendar')?.scrollIntoView({ behavior: 'smooth' })}>Open the calendar <ArrowRight size={16} /></button></div><div className="event-list">{visibleEvents.map((event, index) => <article className="event-row" key={event.id}><div className={`event-date date-${index % 3}`}><CalendarDays size={18} /><span>{event.date.split(',')[0]}</span><b>{event.date.split(',')[1]?.trim().split(' ')[0]}</b></div><div className="event-symbol">{event.emoji}</div><div className="event-info"><span className="event-category">{event.category} <i /> {event.community}</span><h3>{event.title}</h3><span className="event-place"><MapPin size={14} />{event.place}</span></div><div className="event-time"><b>{event.time}</b><span>{event.spots} spots left</span></div><button className="event-join" onClick={() => setSelectedEvent(event)} aria-label={`View and register for ${event.title}`}><ArrowUpRight size={19} /></button></article>)}{visibleEvents.length === 0 && <div className="no-events">No upcoming events match that search in {city}.</div>}</div><div className="events-bottom"><span><span className="green-pulse" /> Preview events—confirm details with organizers</span><span>Calendar and reminders below <ArrowRight size={14} /></span></div></div></section>

      <CalendarSection onEvent={setSelectedEvent} user={user} notify={showNotice} onAuth={() => setAuthMode('register')} refreshKey={refreshKey} location={location} />
      <ConnectSection user={user} onAuth={() => setAuthMode('register')} notify={showNotice} followers={followers} refreshFollowers={refreshMemberData} />
      <ProfileSection user={user} onAuth={() => setAuthMode('register')} onUpdate={(member) => { setUser(member); setLocation({ state: '', district: '', city: member.city }); setCity(member.city) }} notify={showNotice} followers={followers} activity={activity} hostedCommunity={hostedCommunity} />
      <HostDashboard user={user} notify={showNotice} />
      {user && <section className="activity-section section-shell"><div className="eyebrow eyebrow-muted">YOUR PLANS</div><h2>Applications &amp; <em>registrations.</em></h2><div className="activity-grid">{[['Community applications', activity.applications], ['Interest messages', activity.interests], ['Event registrations', activity.registrations], ['Volunteer interest', activity.volunteer]].map(([title, rows]) => <article className="activity-card" key={title}><h3>{title}</h3>{rows.length ? rows.map((row) => <p key={row.id}><span>{row.community || row.event?.title || row.event || row.motive?.slice(0, 55) || title}{row.approver && <small className="approver-line">Reviewed by {row.approver}</small>}</span><b className={`status-${row.status}`}>{row.status}</b></p>) : <small>Nothing here yet.</small>}</article>)}</div><button className="text-link" onClick={async () => { await send('/auth/logout', {}); setUser(null); setNotifications([]); setActivity({ applications: [], interests: [], registrations: [], volunteer: [] }); setHostedCommunity(null); showNotice('You’re signed out.') }}>Sign out <ArrowRight size={14} /></button></section>}
      <VolunteerSection user={user} onAuth={() => setAuthMode('register')} notify={showNotice} refresh={refreshMemberData} />
      <GuidelinesSection />

      <section className="impact-section section-shell" id="impact"><div className="impact-art"><div className="impact-sun">✳</div><div className="impact-ring" /><div className="impact-leaf leaf-one">〰</div><div className="impact-leaf leaf-two">〰</div><div className="impact-card"><HeartHandshake size={21} /><span>little actions,<br /><b>real change</b></span></div><div className="impact-ground" /><div className="impact-label"><span>✳</span> THE NEIGHBORHOOD EFFECT</div></div><div className="impact-copy"><div className="eyebrow eyebrow-muted">GOOD FOR YOU. GOOD FOR HERE.</div><h2>Belonging can<br />make a <em>difference.</em></h2><p>Sometimes showing up for a neighbor is where change begins. Find local cleanups, volunteer days, and community projects that could use another pair of hands.</p><div className="impact-points"><span><Check size={16} /> Volunteer with local groups</span><span><Check size={16} /> Learn by doing, side by side</span><span><Check size={16} /> Celebrate the good you help make</span></div><button className="button button-dark" onClick={() => showNotice('Volunteer opportunities are part of the social impact build phase.')}>Find ways to help <ArrowRight size={16} /></button><small className="impact-note"><ShieldCheck size={14} /> Verified organizations will be clearly identified.</small></div></section>

      <section className="closing-cta"><div className="closing-inner"><div className="closing-flower">✳</div><p>YOUR NEXT GOOD THING IS OUT THERE</p><h2>It starts with <em>hello.</em></h2><button className="button button-light" onClick={() => setAuthMode('register')}>Find your people <ArrowRight size={16} /></button><span className="closing-scribble">↗</span></div></section>
    </main>

    <footer className="footer"><div className="footer-main"><div><Brand /><p>Find your people.<br />Make things happen.</p></div><div className="footer-column"><b>Explore</b><a href="#communities">Communities</a><a href="#events">Events</a><a href="#impact">Social impact</a></div><div className="footer-column"><b>Connectify</b><a href="#home">Our story</a><a href="#home">Community guidelines</a><a href="#home">Privacy</a></div><div className="footer-note"><span>Made for showing up.</span><b>✳</b></div></div><div className="footer-bottom"><span>© 2026 Connectify. Built around community.</span><span className={`api-indicator ${apiStatus}`}><i /> {apiStatus === 'ready' ? 'Connected to local API' : apiStatus === 'checking' ? 'Connecting…' : 'API unavailable'}</span><a href="#home">Back to top ↑</a></div></footer>

    {notice && <div className="toast" role="status"><Sparkles size={16} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15} /></button></div>}
    {selected && <CommunityDialog community={selected} user={user} onClose={() => setSelected(null)} onEvent={(event) => { setSelected(null); setSelectedEvent(event) }} notify={showNotice} refresh={refreshMemberData} onAuth={() => setAuthMode('register')} />}
    {selectedEvent && <EventDialog event={selectedEvent} user={user} onClose={() => setSelectedEvent(null)} notify={showNotice} onAuth={() => setAuthMode('register')} refresh={refreshMemberData} />}
    {authMode && <AuthDialog mode={authMode} onClose={() => setAuthMode('')} onSuccess={(member) => { setUser(member); setCity(member.city); setLocation({ state: '', district: '', city: member.city }); setAuthMode(''); showNotice(member.role === 'communityAdmin' ? 'Host account created and your community is live.' : `Welcome to Connectify, ${member.fullName.split(' ')[0]}.`) }} />}
    {showAlerts && <AlertsPanel items={notifications} onClose={() => setShowAlerts(false)} onRead={async (item) => { if (!item.read) { await send(`/notifications/${item.id}/read`, {}); setNotifications((rows) => rows.map((row) => row.id === item.id ? { ...row, read: true } : row)) } }} />}
  </>
}

export default App
