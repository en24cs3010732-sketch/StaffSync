# StaffSync - HR & Employee Management System

A full-stack MERN app: role-based access (Admin / Manager / Employee), leave management,
attendance tracking, announcements and a dashboard.

## Run it on a Mac (one command)

You only need **Node.js 20+** (`brew install node`, or download from https://nodejs.org).

```bash
cd StaffSync
./start.sh
```

(or double-click **start.command** in Finder - if macOS blocks it, right-click -> Open once.)

The first run installs the dependencies and, if you don't have MongoDB installed,
downloads a small embedded MongoDB automatically (~100 MB, one time). Your browser opens
at http://localhost:5173. Press **Ctrl+C** in the terminal to stop everything.

If `./start.sh` says "permission denied": `chmod +x start.sh start.command`, or run `bash start.sh`.

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5001  (NOT 5000 - macOS uses that port for AirPlay Receiver)

### Optional: use a real MongoDB
```bash
brew tap mongodb/brew && brew install mongodb-community
brew services start mongodb-community
```
StaffSync uses it automatically. Otherwise the embedded database stores its data in `server/.data/`
(delete that folder to reset everything).

## Demo accounts (created automatically on first start)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@staffsync.com` | `Password123!` |
| Manager | `manager@staffsync.com` | `Password123!` |
| Employee | `employee@staffsync.com` | `Password123!` |

## Permissions

- Anyone can self-register, but always as an **Employee** (the very first user in an empty database becomes Admin).
- Only **Admins** can create managers/admins, change roles, or deactivate employees.
- **Managers** can add employees, edit employee details, approve/reject leave and post announcements.

## Tests

```bash
cd server
npm test
```

## Manual run (two terminals)

```bash
cd server && npm install && npm start     # terminal 1
cd client && npm install && npm run dev   # terminal 2
```

## Troubleshooting

| Problem | Fix |
|---|---|
| `Port 5001 is already in use` | Change `PORT` in `server/.env` **and** the proxy target in `client/vite.config.js` |
| Blank page / API errors right after start | Backend is still starting (first run downloads the DB) - wait a minute and refresh |
| `EBADENGINE` / Vite errors | Update Node: `brew upgrade node` (need 20.19+ or 22+) |
| Weird install errors | `rm -rf server/node_modules client/node_modules` and run `./start.sh` again |
