# Connectify task tracker

## Completed

- [x] Inspect Node.js, npm, Git, and VS Code availability.
- [x] Install React, Vite, Tailwind, Express, Mongoose, and supporting packages.
- [x] Create responsive discovery and community detail screens.
- [x] Add objectives, schedules, venues, fees, remaining places, rules, and membership modes.
- [x] Add account creation/login, hashed passwords, HTTP-only sessions, and logout.
- [x] Add profiles, city/interests/skills, email privacy, and discovery opt-out.
- [x] Add open, approval-based, and invite-only applications, custom questions, and interest messages.
- [x] Add application and request status views with in-app alerts.
- [x] Add event details and registration, duplicate/capacity checks, and attendee information.
- [x] Add monthly events calendar and in-app reminders.
- [x] Add people discovery, follow/unfollow, and follower/following lists.
- [x] Add volunteer interest form and community guidelines.
- [x] Add interest and keyword autocomplete; apply searches only on Explore or Enter.
- [x] Add India state/UT, district, and city/ULB selectors and filter communities, events, and calendar together.
- [x] Add member-only chat after approval with privacy guidance and email/phone blocking.
- [x] Add member/community signup selection and community-host onboarding form with a published profile and host dashboard.
- [x] Keep interest and place filters independent, combine them for results, and default member search to their profile city.
- [x] Show named community application reviewers, dashboard activity, citizenship tiers, and coming-soon host perks.
- [x] Expand preview catalog to 15 communities and 8 events across five regions.
- [x] Add Mongoose schemas, ObjectId references, timestamps, indexes, and seed catalog.
- [x] Add one-command local startup, safe `.env.example`, `.gitignore`, and beginner setup docs.

## Still to build

- [ ] Connect MongoDB Atlas and verify records persist across API restarts.
- [ ] Add host inbox for interest messages, member management, and community updates. Membership approve/reject actions are available for host-owned communities.
- [ ] Event organizer tools to create/edit events, review registrations, and verify attendance.
- [ ] Platform administration, reports, blocking, and moderation.
- [ ] Collaboration requests and skill exchange/workshop discovery.
- [ ] Verified NGO directory, verification workflow, volunteer opportunities, and contribution badges.
- [ ] Email/push reminders (current reminders generate in-app alerts while the server is running).
- [ ] Production GitHub and Render setup; no external service is connected yet.
- [ ] Verify complete journeys against MongoDB and production deployment.

## Known limitations

- MongoDB Atlas is not configured. Without `MONGODB_URI`, account/form data is in memory and resets when the API process stops.
- The directory has 15 sample communities and 8 sample events across Nashik, Pune, Mumbai, Bengaluru, Delhi, and Chennai; they remain preview listings.
- Membership applications can be submitted and tracked, but organizers cannot yet review them from a dashboard.
- Event reminders are in-app only. There is no email or push delivery.
- No app deployment or public URL has been created.
