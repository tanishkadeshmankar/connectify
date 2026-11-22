# CITYKATTA — COMPLETE MASTER PRODUCT & DEVELOPMENT SPECIFICATION

Version: 1.0  
Project Type: Full-stack web application  
Developer Experience: Complete Beginner  
Development Environment: VS Code + OpenAI Codex  
Database: MongoDB Atlas  
Code Repository: GitHub  
Hosting: Render

---

# 1. YOUR ROLE

Act as my Senior Software Architect, Full-Stack Developer, UI/UX Designer, Database Engineer, Testing Engineer and Beginner-Friendly Technical Mentor.

I am a complete beginner in programming and web development.

I have some familiarity with MongoDB and GitHub, but I am not confident using them.

I do not know React, Node.js, Express, APIs, deployment or hosting.

Therefore:

- Do not assume I understand technical terminology.
- Explain technical decisions in simple English.
- Never ask me to perform complicated tasks without instructions.
- Give exact steps and commands.
- Explain where to enter each command.
- Explain what result I should expect.
- If an error occurs, help me fix it before proceeding.
- Never skip important setup steps.
- Never assume that an application or account has already been configured.
- Do not overwhelm me with too many instructions at once.

Your goal is not just to write code. Your goal is to help me successfully build, understand, run, maintain and deploy CITYKATTA.

# 2. PRODUCT OVERVIEW

CITYKATTA is a location-based community discovery, networking, event participation and social-impact platform.

Core philosophy:

"Help people discover people like themselves, find communities, develop skills, participate in activities and contribute positively to society."

CITYKATTA is not another social media application.

It should encourage actual participation in communities and activities instead of endless scrolling.

Example:

A user living in Nashik selects their city and interests.

They discover:
- Photography communities.
- Coding clubs.
- Dance groups.
- Startup communities.
- Workshops.
- Competitions.
- Local concerts.
- Volunteering opportunities.

They can apply to join communities, attend events, meet people with similar interests and develop skills.

# 3. TECHNOLOGY STACK

Use the following technologies.

Frontend:
- React.
- Vite.
- JavaScript initially, with TypeScript only if it can be introduced without unnecessary complexity.
- Tailwind CSS.
- Reusable UI components.

Backend:
- Node.js.
- Express.js.

Database:
- MongoDB.
- MongoDB Atlas for cloud hosting.

Additional tools:
- Git.
- GitHub.
- Render for website hosting.
- OpenStreetMap for future map integration.

Do not replace MongoDB with Supabase or another database.

Do not introduce unnecessary technologies.

Keep the initial application simple and maintainable.

# 4. APPLICATION MODULES

## A. Landing Page
Create:
- CITYKATTA logo and branding.
- Navigation bar.
- Hero section.
- City discovery section.
- Featured communities.
- Upcoming events.
- How CITYKATTA works.
- Social impact section.
- Footer.
- Login and registration buttons.

## B. Authentication
Implement:
- User registration.
- User login.
- Logout.
- Password hashing.
- Protected pages.
- Session management.
- Input validation.
- Proper error messages.

Never store plain-text passwords.

## C. User Onboarding
Collect:
- Full name.
- Email.
- Password.
- Age eligibility.
- City.
- Interests.
- Profile image (optional).
- Bio (optional).

Allow multiple interests.

Categories:
- Technology.
- Creative.
- Sports.
- Learning.
- Social impact.
- Lifestyle.

## D. City-Based Dashboard
Show:
- Selected city.
- Recommended communities.
- Upcoming events.
- Popular activities.
- Workshops.
- Competitions.
- Community updates.
- Search functionality.

Allow manual city switching.

Do not continuously track user locations.

## E. Community Discovery
Users should be able to:
- Browse communities.
- Search communities.
- Filter by city.
- Filter by category.
- View community details.
- View community rules.
- View organisers.
- View member count.
- Apply for membership.

Community profiles should contain:
- Name.
- Logo.
- Description.
- Category.
- City.
- Online/offline/hybrid mode.
- Organiser information.
- Rules.
- Membership requirements.
- Upcoming events.

## F. Membership Application
Allow community administrators to create custom application questions.

Users should:
1. Open a community.
2. Read its information.
3. Click Join.
4. Fill the membership form.
5. Submit the application.
6. See application status.

Administrators should:
- View applications.
- Approve applications.
- Reject applications.
- View application answers.
- Manage members.

Support open, approval-based and invite-only communities.

## G. Events
Users should discover:
- Workshops.
- Concerts.
- Competitions.
- Hackathons.
- College events.
- Cultural activities.
- Sports events.
- Networking events.
- Volunteering activities.

Event details:
- Title.
- Description.
- Organiser.
- Date.
- Time.
- Venue.
- City.
- Capacity.
- Registration deadline.
- Entry fee information.
- Eligibility.
- Online/offline format.

Support:
- Internal registration forms.
- External Google Forms links.
- Registration confirmation.
- Registration status.
- Capacity restrictions.
- Event management.

Do not implement payment processing in the first version.

## H. User Profiles
Display:
- Name.
- City.
- Interests.
- Skills.
- Communities.
- Events attended.
- Projects.
- Achievements.

Allow optional social links.

Do not expose phone numbers, private emails or exact residential locations publicly.

## I. Find Your People
Build a basic discovery system based on:
- Shared interests.
- Skills.
- City.
- Community membership.
- Collaboration preferences.

Users can create collaboration requests.

Users must be able to control whether they appear in discovery.

No automated AI matching is required in the first version.

## J. Skill Exchange
Allow users to:
- List skills they can teach.
- List skills they want to learn.
- Discover workshops.
- Discover peer-learning sessions.
- Find potential mentors.

## K. Social Impact
Create a section for:
- Verified NGOs.
- Volunteering opportunities.
- Environmental activities.
- Educational activities.
- Community service.
- Social initiatives.

Implement NGO verification before displaying an organisation as verified.

## L. Contribution Badges
Introduce:
- Bronze Citizen.
- Silver Citizen.
- Gold Citizen.
- Platinum Citizen.

Badges should depend on verified participation and meaningful contribution.

Do not allow users to purchase badges.

Do not implement complex scoring in the first release.

## M. Notifications
Implement basic in-app notifications for:
- Membership approval.
- Membership rejection.
- Event registration.
- Event updates.
- Community announcements.

Email and push notifications can be introduced later.

## N. Administration
Create separate permission-based dashboards.

Community administrators:
- Manage communities.
- Review applications.
- Manage members.
- Create announcements.

Event organisers:
- Create events.
- Manage registrations.
- Update event details.
- Verify attendance.

Platform administrators:
- Manage users.
- Review reports.
- Verify organisations.
- Moderate content.

# 5. USER ROLES

Implement:
1. Visitor.
2. Registered User.
3. Community Administrator.
4. Event Organiser.
5. Platform Administrator.
6. Verified NGO Administrator (later phase).

Enforce permissions on the backend, not only in the frontend.

# 6. DATABASE DESIGN

Use MongoDB collections.

Required collections:

- users
- cities
- interests
- communities
- memberships
- membershipQuestions
- membershipAnswers
- events
- eventRegistrations
- attendance
- follows
- collaborationRequests
- feedback
- notifications
- reports

Later collections:
- ngos
- ngoVerifications
- volunteerOpportunities
- contributions
- badges
- subscriptions

Requirements:
- Use MongoDB ObjectIds.
- Define relationships using references where appropriate.
- Add validation.
- Add timestamps.
- Prevent duplicate registrations.
- Prevent duplicate membership applications.
- Use database indexes for common searches.
- Protect private user information.
- Validate all incoming data.

# 7. USER INTERFACE

Create a modern, welcoming and youthful design.

Design principles:
- Clean interface.
- Light backgrounds.
- Vibrant accent colours.
- Attractive event cards.
- Modern community cards.
- Responsive layout.
- Readable fonts.
- Simple navigation.
- Consistent components.

Navigation:
1. Home.
2. Explore.
3. Communities.
4. Events.
5. Connect.
6. Social Impact.
7. Profile.

The website must work on:
- Desktop.
- Laptop.
- Tablet.
- Mobile.

# 8. SECURITY AND PRIVACY

Implement:
- Password hashing.
- Authentication.
- Role-based permissions.
- Backend validation.
- Secure API routes.
- Environment variables.
- Protection against common web attacks.
- User reporting.
- User blocking.
- Privacy controls.
- Data access restrictions.

Do not expose:
- Database passwords.
- API secrets.
- Private email addresses.
- Personal phone numbers.
- Private user information.

Add appropriate age restrictions and safeguards for student participation and offline meetups.

Do not allow unverified organisations to collect donations under a verified identity.

# 9. DEVELOPMENT PHASES

Build the application in this order.

PHASE 1 — FOUNDATION
- Inspect the computer environment.
- Check Node.js.
- Check Git.
- Set up VS Code project.
- Create frontend.
- Create backend.
- Connect MongoDB.
- Configure GitHub.
- Test basic application.

PHASE 2 — USER SYSTEM
- Landing page.
- Registration.
- Login.
- Logout.
- Profile creation.
- City selection.
- Interest selection.

PHASE 3 — COMMUNITIES
- Community discovery.
- Community profiles.
- Community creation.
- Membership forms.
- Application management.
- Administrator approvals.

PHASE 4 — EVENTS
- Event discovery.
- Event details.
- Event creation.
- Event registration.
- Registration management.

PHASE 5 — ADMINISTRATION
- Community dashboard.
- Event dashboard.
- Platform administration.
- Basic reporting and moderation.

PHASE 6 — SOCIAL FEATURES
- User discovery.
- Following.
- Collaboration requests.
- Skill exchange.
- Basic notifications.

PHASE 7 — SOCIAL IMPACT
- NGO directory.
- Verification.
- Volunteer registration.
- Attendance verification.
- Contribution badges.

PHASE 8 — TESTING
- Test all forms.
- Test authentication.
- Test database operations.
- Test permissions.
- Test mobile responsiveness.
- Fix errors.
- Test complete user journeys.

PHASE 9 — DEPLOYMENT
- Prepare production configuration.
- Create MongoDB Atlas database.
- Connect GitHub.
- Configure Render.
- Set environment variables.
- Deploy the website.
- Test the public website.
- Document how to update it.

# 10. HOW I WILL RUN THE WEBSITE

This is a mandatory requirement.

Create an easy development startup system.

I should be able to:
1. Open VS Code.
2. Open my CITYKATTA folder.
3. Open the terminal.
4. Run one command.
5. Open the website in Chrome.

Prefer:

npm run dev

This command should start both the frontend and backend.

The website should run locally at an easy-to-understand address, such as localhost:5173.

Also explain:
- How to stop the website.
- How to restart it.
- How to fix common startup errors.
- How to install missing dependencies.
- How to check whether MongoDB is connected.

Create a README.md containing these instructions.

# 11. GITHUB BACKUP

Set up GitHub integration.

Explain:
- How to create a repository.
- How to save code.
- How to commit changes.
- How to push changes.
- How to retrieve code.

Create a .gitignore file.

Never upload .env files or credentials.

Create a safe .env.example file containing placeholder variable names only.

# 12. DEPLOYMENT

Use Render for hosting the initial application.

Use MongoDB Atlas for the cloud database.

Preferred deployment architecture:
- Build React frontend.
- Serve the frontend through the Express backend in production.
- Deploy the combined application as one Render web service.
- Connect the backend to MongoDB Atlas.
- Configure production environment variables through Render.
- Ensure the application can run independently of my laptop.

Document:
- How to create a Render account.
- How to connect GitHub.
- How to select the repository.
- How to configure build and start commands.
- How to add environment variables.
- How to deploy.
- How to obtain the public website link.
- How to check deployment logs.
- How to redeploy after code changes.

Never publish database credentials.

Never claim deployment is successful unless the public URL has actually been tested.

Explain any free-tier limitations and hosting costs before a paid service is selected.

# 13. HOW TO UPDATE THE WEBSITE

Explain the complete update process:

1. Open the project in VS Code.
2. Modify code using Codex.
3. Test locally.
4. Save changes.
5. Push changes to GitHub.
6. Allow Render to deploy the updated version.
7. Test the public website.

Explain how to recover from a failed deployment.

# 14. PROJECT DOCUMENTATION

Create and maintain:

README.md
- Project overview.
- Software requirements.
- Installation instructions.
- Startup instructions.
- Database connection.
- Deployment instructions.

DEVELOPMENT_LOG.md
- What has been completed.
- What has changed.
- What remains.

TASKS.md
- Pending features.
- Completed features.
- Known bugs.

.env.example
- Required environment variable names.

Also create database setup and migration documentation.

# 15. TESTING REQUIREMENTS

Test:
- Registration.
- Login.
- Logout.
- Profile creation.
- City selection.
- Community creation.
- Membership applications.
- Admin approval.
- Event creation.
- Event registration.
- Capacity restrictions.
- Database connection.
- Permissions.
- Mobile layouts.
- Production deployment.

Never mark a feature completed merely because its screen looks correct.

Verify that the actual database operation works.

# 16. DEVELOPMENT RULES FOR CODEX

These rules are extremely important.

1. I am a complete beginner.
2. Do not generate the entire application in one response.
3. Work on one logical module at a time.
4. Explain what you are doing before major changes.
5. Give me exact terminal commands.
6. Tell me whether a command goes into the VS Code terminal or somewhere else.
7. Explain what successful output looks like.
8. Never assume I know how to fix errors.
9. Inspect existing code before modifying it.
10. Do not unnecessarily replace working files.
11. Keep the project organised.
12. Use reusable components.
13. Keep security in mind.
14. Test each feature.
15. Update project documentation.
16. Keep track of completed work.
17. Ask for my approval before major architectural changes.
18. Do not move to the next development phase until the current phase is working.
19. Never pretend that an external service has been connected or deployed.
20. Explain all important decisions in simple English.

# 17. FIRST TASK — DO NOT START CODING YET

Before writing any application code:

Step 1:
Inspect my computer's development environment.

Step 2:
Check whether Node.js, npm, Git and VS Code are available.

Step 3:
Explain what is missing.

Step 4:
Guide me through installing missing software, one step at a time.

Step 5:
Explain how to create and open the CITYKATTA project folder.

Step 6:
Recommend the project folder structure.

Step 7:
Explain how to create a MongoDB Atlas database and connect it securely.

Step 8:
Explain how to create a GitHub repository and connect it to VS Code.

Step 9:
Prepare a realistic development roadmap.

Step 10:
Wait for my confirmation before starting the first implementation.

FINAL OBJECTIVE:

Help me build a working CITYKATTA website from absolute beginner level to a deployed public website.

I should understand how to:
- Open my project.
- Start my website.
- Stop my website.
- Restart my website.
- Save my code.
- Back up my code.
- Fix common errors.
- Update my website.
- Deploy my website.
- Access my published website.

Do not rush. Guide me step by step.

The final result must be a working product, not just a collection of attractive frontend screens.