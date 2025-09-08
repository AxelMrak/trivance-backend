# Express API Starter with Typescript

How to use this template:

```sh
npx create-express-api --typescript --directory my-api-name
```

Includes API Server utilities:

* [morgan](https://www.npmjs.com/package/morgan)
  * HTTP request logger middleware for node.js
* [helmet](https://www.npmjs.com/package/helmet)
  * Helmet helps you secure your Express apps by setting various HTTP headers. It's not a silver bullet, but it can help!
* [dotenv](https://www.npmjs.com/package/dotenv)
  * Dotenv is a zero-dependency module that loads environment variables from a `.env` file into `process.env`
* [cors](https://www.npmjs.com/package/cors)
  * CORS is a node.js package for providing a Connect/Express middleware that can be used to enable CORS with various options.

Development utilities:

* [typescript](https://www.npmjs.com/package/typescript)
  * TypeScript is a language for application-scale JavaScript.
* [ts-node](https://www.npmjs.com/package/ts-node)
  * TypeScript execution and REPL for node.js, with source map and native ESM support.
* [nodemon](https://www.npmjs.com/package/nodemon)
  * nodemon is a tool that helps develop node.js based applications by automatically restarting the node application when file changes in the directory are detected.
* [eslint](https://www.npmjs.com/package/eslint)
  * ESLint is a tool for identifying and reporting on patterns found in ECMAScript/JavaScript code.
* [typescript-eslint](https://typescript-eslint.io/)
  * Tooling which enables ESLint to support TypeScript.
* [jest](https://www.npmjs.com/package/jest)
  * Jest is a delightful JavaScript Testing Framework with a focus on simplicity.
* [supertest](https://www.npmjs.com/package/supertest)
  * HTTP assertions made easy via superagent.

## Setup

```
npm install
```

## Lint

```
npm run lint
```

## Test

```
npm run test
```

### Test layout

- Unit tests: `test/unit/**` (no DB required)
- Integration tests: `test/integration/**` (hits API + DB)
- Shared helpers: `test/setup.ts` and `test/utils/*`

### Database in tests

Tests now prefer the root `.env` `DATABASE_URL` so you can reuse your dev DB. When `NODE_ENV=test`:

- Loads `../.env` first; if `DATABASE_URL` is missing, falls back to `backend/.env.test`.
- If the URL host is `trivance-db`, it is rewritten to `localhost` to work from the host machine while Docker is running.

### Integration tests with Docker Postgres

Tests use the same database defined by `DATABASE_URL` but, when running on host, they automatically map the Docker hostname `trivance-db` to `localhost` so they can connect through the published port `5432`.

- Ensure the stack is running: `docker compose up --build` (root of repo).
- Optionally, set `backend/.env.test` with `DATABASE_URL=postgres://postgres:postgres@localhost:5432/trivance_db` to be explicit.
- Run only integration tests:

```
npm run test:int
```

## Development

```
npm run dev
```

## API Guide (for Frontend)

Below is a practical, easy-to-scan list of endpoints, request bodies, and requirements. Authentication uses either an `Authorization: Bearer <token>` header or the `token` cookie set by the auth endpoints.

Roles (numeric levels)
- 0: GUEST
- 1: CLIENT
- 2: STAFF
- 3: MANAGER
- 4: ADMIN
- 5: SUPER_USER

Health & Root
- GET `/health`
  - Auth: none
  - Returns simple health info
- GET `/`
  - Auth: none
  - Returns `{ status: "OK" }`

Auth
- POST `/auth/sign-up`
  - Auth: none
  - Body: `{ name, email, password, confirmedPassword, phone, address }`
  - Sets `token` cookie and returns `{ user }`
- POST `/auth/sign-in`
  - Auth: none
  - Body: `{ email, password }`
  - Sets `token` cookie and returns `{ user }`
- POST `/auth/sign-out`
  - Auth: required
  - Clears `token` cookie
- GET `/auth/me`
  - Auth: required
  - Returns `{ user }`

Services
- POST `/services/create`
  - Auth: required
  - Role: STAFF+
  - Body: `{ name: string, description: string, price: number, duration: "HH:MM:SS" }`
  - Returns created service
- GET `/services/get/:id`
  - Auth: required
  - Returns service by id
- GET `/services/getAll`
  - Auth: required
  - Returns array of services for the company
- PUT `/services/update/:id`
  - Auth: required
  - Role: STAFF+
  - Body (partial allowed): `{ name?, description?, price?, duration? }`
  - Returns updated service
- DELETE `/services/delete/:id`
  - Auth: required
  - Role: STAFF+
  - Returns 204 (no content)

Appointments
- POST `/appointments/create`
  - Auth: required
  - Body: `{ service_id: string, start_date: ISOString, description?: string }`
  - Default status behavior for roles below STAFF:
    - `confirmed` only if the time slot is available AND the service does not require deposit
    - otherwise `pending`
  - Returns created appointment (normalized fields only)
- GET `/appointments/getAll`
  - Auth: required
  - CLIENT sees own appointments; STAFF+ sees all
- GET `/appointments/get/:id`
  - Auth: required
  - CLIENT can only access own appointment
- PUT `/appointments/update/:id`
  - Auth: required
  - Body (partial allowed): `{ description?, start_date?, status? }`
  - Status updates are restricted:
    - Only STAFF+ can change `status`
    - STAFF+ can only change `status` of their own appointments
  - Returns updated appointment
- DELETE `/appointments/delete/:id`
  - Auth: required
  - Role: STAFF+
  - Returns 204 (no content)
- POST `/appointments/payment/:id/link`
  - Auth: required
  - Only appointment owner can request a payment link
  - Returns `{ orderId, paymentLink, paymentDetails }`

Clients (managed by staff)
- GET `/clients/getAll`
  - Auth: required
  - Role: STAFF+
  - Returns array of client users
- GET `/clients/get/:id`
  - Auth: required
  - Role: STAFF+
  - Returns client by id
- PUT `/clients/update/:id`
  - Auth: required
  - Role: STAFF+
  - Body (partial allowed): `{ name?, email?, phone?, address? }`
  - Returns updated client
- DELETE `/clients/delete/:id`
  - Auth: required
  - Role: STAFF+
  - Returns 204 (no content)

Users (basic demo endpoints)
- GET `/users/getAll`
  - Auth: none (consider protecting in production)
- GET `/users/get/:id`
  - Auth: none (consider protecting in production)

Webhooks (FYI — not for frontend consumption)
- POST `/webhooks/mercadopago`
  - Expects raw JSON body and Mercado Pago signature headers
  - Used to process payment notifications
