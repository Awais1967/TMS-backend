# TMS Admin Backend

Node.js, Express, MongoDB, and Mongoose backend for the TMS Admin Panel MVP.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and set at least:

```bash
PORT=4008
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_long_random_secret
CLIENT_URL=http://localhost:5173
STORAGE_DRIVER=local
```

3. Seed the admin user:

```bash
npm run seed:admin
```

Default local admin:

```text
admin@example.com / password123
```

4. Start the backend:

```bash
npm run dev
```

The API runs at `http://localhost:4008`.

## Health Check

```bash
curl http://localhost:4008/api/health
```

## Seed Data

Run module seeds as needed:

```bash
npm run seed:loads
npm run seed:documents
npm run seed:carriers
npm run seed:drivers
npm run seed:trucks
npm run seed:truck-need-cover
npm run seed:tracking
npm run seed:accounting
npm run seed:direct-bills
npm run seed:factoring
npm run seed:settlements
```

## Public Routes

- `GET /api/health`
- `POST /api/auth/login`

All other API routes require `Authorization: Bearer <token>`.

## Uploads

File upload endpoints use `multipart/form-data` with file field name `file`.

Allowed file types:

- PDF
- JPG
- JPEG
- PNG

Max file size is 10MB. Local uploads are served from `/uploads`.

## Storage

Default storage is local. S3 support is optional:

```bash
STORAGE_DRIVER=local
```

When `STORAGE_DRIVER=s3` but AWS credentials are missing, uploads fall back to local storage without crashing.
