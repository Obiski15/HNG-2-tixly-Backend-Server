# Tixly - Backend Server

JSON-based REST API server with authentication for the Tixly ticket management system.

## 🚀 Tech Stack

- **Runtime**: Node.js
- **Framework**: JSON Server
- **Authentication**: Custom JWT-like tokens with HTTP-only cookies

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 16+ installed
- pnpm, npm, or yarn package manager

### Installation

1. **Install dependencies:**

```bash
pnpm install
# or
npm install
# or
yarn install
```

2. **Create environment file:**

Create a `.env` file in the server directory:

```bash
touch .env
```

3. **Configure environment variables:**

Edit `.env` with the following:

```env
ALLOWED_ORIGINS = Allowed frontend origins (comma-separated)

NODE_ENV=development

# Server port (optional, defaults to 4000)
PORT=4000
```

**Important**: Add all frontend URLs that need to access this API to `ALLOWED_ORIGINS`.

4. **Initialize database:**

The `db.json` file will be auto-created on first run with this structure:

```json
{
  "users": [],
  "tickets": []
}
```

You can also create it manually if needed.

5. **Start the server:**

```bash
pnpm dev
# or
npm run dev
```

The server will run on `http://localhost:4000`
