# MongoDB Atlas setup

Connectify uses MongoDB through Mongoose. The app can start without a database and serves sample discovery data. Database-backed features should be enabled only after the Atlas connection is configured.

## Create a database

1. Sign in to MongoDB Atlas and create a project for Connectify.
2. Create a database deployment. Review the displayed plan and any current pricing before choosing a paid option.
3. Create a database user with a strong password. This is separate from your Atlas website sign-in.
4. In **Network Access**, add the IP address you will use for local development. For production, add the appropriate Render outbound access configuration; do not leave broad public access enabled unless you understand the security tradeoff.
5. Choose **Connect → Drivers**, select Node.js, and copy the connection string. Replace the username, password, and database name placeholders. If the password contains special characters, URL-encode them.

## Add your local connection string

1. In the project folder, copy `.env.example` to a new file named `.env`.
2. Open `.env` in VS Code and set `MONGODB_URI` to the Atlas connection string.
3. Replace `JWT_SECRET` with a long random secret. Keep `.env` private; `.gitignore` excludes it.
4. Restart `npm run dev`. Check `http://localhost:3001/api/health`; `database` should say `connected`.

Never paste the real connection string or password into chat, source files, screenshots, or GitHub. For Render, add the values in the service's Environment settings instead of uploading `.env`.
