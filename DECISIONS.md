
DECISIONS & TRADEOFFS (short)
- Used SQLite for speed in test; migrate to Postgres in production.
- Simple JWT cookie auth with bcrypt hashed passwords to keep auth light-weight.
- Files saved locally under /uploads with UUID-prefixed names to avoid collisions.
- KYC and financials are mocked for the test; real services require secure tokens and callbacks.
- WebSocket implemented via fastify-websocket for minimal real-time chat; Ably/third-party can be swapped later.
- Zod used for runtime validation on important endpoints.
