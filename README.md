# iGuard Server

`iGuard` is a single-origin Express.js backend that serves both the web interface and the API for the graduation project. It provides:

- user registration and login
- JWT authentication stored in an HTTP-only cookie
- protected search access for authenticated users
- Ahmia-backed hidden service search results

The server also serves the frontend pages from `public/`, so the app runs from one local origin instead of separate frontend and backend servers.

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT authentication
- Vanilla HTML, CSS, and JavaScript frontend

## Project Structure

```text
server/
├── index.js
├── package.json
├── public/
│   ├── login.html
│   ├── register.html
│   ├── search.html
│   ├── css/
│   │   └── main.css
│   └── js/
│       ├── auth.js
│       ├── common.js
│       └── search.js
└── src/
    ├── app.js
    ├── config/
    ├── controllers/
    ├── middleware/
    ├── models/
    ├── routes/
    ├── services/
    └── utils/
```

## Features

- Register a new account with username, email, and password
- Log in and receive a secure `auth_token` cookie
- Keep users signed in with JWT-based session handling
- Protect the search page and search API behind authentication
- Search through Ahmia and return parsed search results with categories
- Redirect guests to `/login` and authenticated users to `/search`

## Installation Guide

### 1. Go to the server folder

```bash
cd /home/mahmoud/Desktop/moody-graduation-project/server
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create your environment file

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Example:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/iguard-auth
JWT_SECRET=replace-this-with-a-strong-secret
NODE_ENV=development
```

### 4. Start MongoDB

Make sure your MongoDB server is running locally, or update `MONGODB_URI` to point to your MongoDB instance.

### 5. Start the application

```bash
npm start
```

For local development, `npm run dev` runs the same entrypoint.

### 6. Open the app

```text
http://localhost:5000
```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | Port used by the Express server. Default is `5000`. |
| `MONGODB_URI` | Yes | MongoDB connection string. |
| `JWT_SECRET` | Yes | Secret used to sign and verify JWT tokens. |
| `NODE_ENV` | No | App environment. Use `production` to enable secure cookies over HTTPS. |

## Application Routes

### Page Routes

| Route | Method | Description |
| --- | --- | --- |
| `/` | `GET` | Redirects to `/search` if the user is authenticated, otherwise `/login`. |
| `/login` | `GET` | Displays the login page for guests. |
| `/register` | `GET` | Displays the registration page for guests. |
| `/search` | `GET` | Displays the protected search page for authenticated users. |

### API Endpoints

#### `GET /api/health`

Simple health check endpoint.

Response example:

```json
{
  "ok": true,
  "environment": "development"
}
```

#### `POST /api/auth/register`

Creates a new user and signs them in immediately by setting the `auth_token` cookie.

Request body:

```json
{
  "username": "mahmoud",
  "email": "mahmoud@example.com",
  "password": "123456"
}
```

Validation:

- `username`, `email`, and `password` are required
- `password` must be at least 6 characters
- `email` must be in a valid format
- username and email must be unique

Success response:

```json
{
  "message": "Registration successful.",
  "user": {
    "id": "USER_ID",
    "username": "mahmoud",
    "email": "mahmoud@example.com",
    "createdAt": "2026-03-28T18:00:00.000Z",
    "updatedAt": "2026-03-28T18:00:00.000Z"
  }
}
```

#### `POST /api/auth/login`

Authenticates a user and sets the `auth_token` cookie.

Request body:

```json
{
  "email": "mahmoud@example.com",
  "password": "123456"
}
```

Success response:

```json
{
  "message": "Login successful.",
  "user": {
    "id": "USER_ID",
    "username": "mahmoud",
    "email": "mahmoud@example.com",
    "createdAt": "2026-03-28T18:00:00.000Z",
    "updatedAt": "2026-03-28T18:00:00.000Z"
  }
}
```

Common error responses:

- `400` if email or password is missing
- `401` if the credentials are invalid

#### `POST /api/auth/logout`

Clears the authentication cookie.

Success response:

```json
{
  "message": "Logout successful."
}
```

#### `GET /api/auth/me`

Returns the currently authenticated user.

Authentication:

- Requires a valid `auth_token` cookie

Success response:

```json
{
  "user": {
    "id": "USER_ID",
    "username": "mahmoud",
    "email": "mahmoud@example.com",
    "createdAt": "2026-03-28T18:00:00.000Z",
    "updatedAt": "2026-03-28T18:00:00.000Z"
  }
}
```

Error response:

```json
{
  "error": "Authentication required."
}
```

#### `POST /api/search`

Runs a protected search request against Ahmia and returns parsed results.

Authentication:

- Requires a valid `auth_token` cookie

Request body:

```json
{
  "query": "marketplace"
}
```

Success response:

```json
{
  "results": [
    {
      "title": "Example Result",
      "description": "Example description",
      "link": "https://ahmia.fi/search/?q=example",
      "onion": "exampleexample.onion",
      "category": "Marketplace",
      "last_seen": "2026-03-28"
    }
  ]
}
```

Possible categories:

- `Malware`
- `Marketplace`
- `Forum`
- `Other`

Common error responses:

- `400` if `query` is missing
- `401` if the user is not authenticated
- `502` if Ahmia cannot be reached or the response cannot be parsed

## Authentication Flow

- The app stores a JWT in an HTTP-only cookie named `auth_token`
- Cookie lifetime is 7 days
- In production, cookies are marked `secure`
- Guests trying to open `/search` are redirected to `/login`
- Authenticated users trying to open `/login` or `/register` are redirected to `/search`

## Available Scripts

```bash
npm start
npm run dev
npm run check
```

- `npm start`: starts the server
- `npm run dev`: starts the same server entrypoint for development
- `npm run check`: checks JavaScript syntax in `index.js` and all files inside `src/`

## Notes

- The frontend uses relative requests such as `/api/auth/login` and `/api/search`
- `GET /api/auth/me` is used by the search page to verify the session on load
- Search results are parsed heuristically from Ahmia HTML responses
- Unknown `/api/*` routes return JSON `404` responses
- Non-API unknown routes redirect back to `/`
