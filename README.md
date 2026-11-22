# Connectify

Connectify helps people find local communities, events, shared interests, and ways to contribute. The original product requirements are kept in [`spec.md`](./spec.md); this project uses **Connectify** as the app name.

## What is ready now

- Responsive community discovery and details: objectives, rules, schedule, venue, fees, available places, and membership type.
- Search suggestions for interests, keywords, categories, communities, and events; Explore applies the search and opens matching results.
- A single alphabetical India place search for state/UT, district, city, and town that filters communities, events, and the calendar together.
- A map that recenters for each selected place, with red community markers and green event markers.
- Event registration form, and a member chat available after community approval, with personal contact details blocked in chat.
- Account creation and sign-in with hashed passwords, a private HTTP-only session cookie, profile editing, interests, skills, and a discovery privacy control.
- Member and community-host signup. Host onboarding collects community objectives, location, schedule, venue, capacity, fee, discount code, and the named community lead, then publishes the profile.
- Member dashboard with profile details, named application reviewers, registrations, and Bronze/Gold/Platinum/Diamond Connectify citizenship progress.
- Host dashboard for community-owned listings, with applicant answers and approve/decline actions. Applicants receive an in-app decision alert.
- Open, approval-based, and invite-only community flows, including custom application questions, interest messages, application status, and alerts.
- Event details and registration, attendee/contact fields, eligibility confirmation, capacity checks, a monthly calendar, and in-app reminders.
- People discovery, follow/unfollow, follower/following lists, and private email handling.
- Volunteer interest submissions with motive, ideas, email, optional phone, availability, and submission alerts.
- Community guidelines, Express APIs, and MongoDB/Mongoose models.

**Database status:** MongoDB Atlas is not configured on this computer yet. Until `MONGODB_URI` is set, account and form data stay in server memory and reset when the API stops. The site works locally in this mode, but configure Atlas before using it with real community members. Organizer approval dashboards, email/push delivery, and platform moderation are still future work.

## Requirements

- Node.js 20.19 or newer (Node.js 24 is installed on the development computer).
- npm (installed with Node.js).
- VS Code is recommended.

## Start the website

1. Open the `COMMUNITY PROJECT` folder in VS Code.
2. Choose **Terminal → New Terminal**.
3. Run this command in the VS Code terminal:

   ```powershell
   npm run dev
   ```

4. Wait for the terminal to show the Vite address, then open **http://localhost:5173** in Chrome.

This starts the website and API together. Leave the terminal open while you use the site. Press **Ctrl+C** in that terminal to stop it. Run `npm run dev` again to restart it.

If packages are missing, run `npm install` in the project folder and retry. If the terminal says a port is already in use, stop the other running copy with Ctrl+C first.

## Check the API

Open **http://localhost:3001/api/health** in a browser. A running API returns JSON containing `"status":"ok"`. Until MongoDB is configured, its `database` value says `not-configured`; the site still works locally, but submitted data resets when the server stops.

## MongoDB Atlas setup

See [`docs/DATABASE_SETUP.md`](./docs/DATABASE_SETUP.md). Never put a real password in `spec.md`, source code, or GitHub. Copy `.env.example` to `.env`, then fill in the local values. The `.env` file is ignored by Git.

## Project map

```text
src/                 React screens and styles
server/              Express API and sample discovery data
docs/                Database setup and deployment notes
spec.md              Complete original product specification
```

## GitHub backup

Git is installed. To create a private GitHub backup:

1. Sign in to GitHub in your browser and create a new **private** repository named `connectify` (do not add a README or license there).
2. In the VS Code terminal, from this folder, run:

   ```powershell
   git init
   git add .
   git commit -m "Create Connectify foundation"
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_NAME/connectify.git
   git push -u origin main
   ```

3. Replace `YOUR_GITHUB_NAME` with your GitHub username. GitHub may open a browser to sign you in. `.env` and `node_modules` are excluded by `.gitignore`.

After later edits, save a backup with `git add .`, `git commit -m "Describe your changes"`, and `git push`.

## Render deployment

The Express server is configured to serve the built React app when `NODE_ENV=production`. After MongoDB Atlas and GitHub are configured, create a Render **Web Service**, connect the repository, set build command to `npm install && npm run build`, set start command to `npm start`, and add `NODE_ENV=production`, `MONGODB_URI`, and a long random `JWT_SECRET` in Render’s environment settings. Do not commit those values. Render pricing and free-tier limits can change, so review the current plan and cost shown in your Render account before selecting a paid plan. Deployment is not set up or claimed complete yet.

## Planned development order

See [`TASKS.md`](./TASKS.md). Location data details and refresh instructions are in [`docs/LOCATION_DATA.md`](./docs/LOCATION_DATA.md). Next connect Atlas and verify data survives restarts, then build organizer review dashboards, platform moderation, remaining social-impact verification, and deployment.
