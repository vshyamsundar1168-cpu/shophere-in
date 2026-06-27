# Design Document: MongoDB Atlas Integration

## Overview

This design covers the full migration of ShopHere.in's data layer from flat JSON files to MongoDB Atlas. The migration is purely a backend concern — all existing HTTP routes, request/response shapes, and frontend assets stay unchanged. The key changes are:

1. A new `db.js` module encapsulates Atlas connection management.
2. A new `.env` file provides `MONGODB_URI` and `PORT`.
3. `server.js` loses `dbLoad()` / `dbSave()` and every `fs.readFileSync` / `fs.writeFileSync` call that touches the `data/` directory.
4. Every route handler is rewritten to use `async/await` with the `mongodb` driver's collection API.
5. Server startup becomes an async function that waits for the DB connection before listening.

The `mongodb` v6 driver is already listed in `package.json`; no new dependencies are required.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Process startup                                             │
│                                                              │
│  require('dotenv').config()   ← loads .env                  │
│       │                                                      │
│  startServer()   (async)                                     │
│       │                                                      │
│  connectDB()  ────────────────────► MongoDB Atlas            │
│  (db.js)          mongodb+srv://…       shophere db          │
│       │                                                      │
│  seedCollections()   (first-run only)                        │
│       │                                                      │
│  deriveCounters()   nextPid / nextOid / nextBid              │
│       │                                                      │
│  server.listen(PORT)                                         │
└──────────────────────────────────────────────────────────────┘

HTTP request → route handler → getDb().collection(…) → Atlas
```

**Key design decisions:**

- **No ORM / ODM** — raw `mongodb` driver to match the existing zero-dependency style.
- **In-process counters** — `nextPid`, `nextOid`, `nextBid` remain in-memory integers derived at startup from `$max` aggregation. This avoids an extra round-trip per write. Concurrent-write safety is not a concern for a single-process Node server.
- **Numeric `id` field retained** — documents keep an application-managed integer `id` field alongside MongoDB's `_id`. This preserves all existing API contracts without touching the frontend.
- **`categories` as documents** — stored as `{ name: String }` documents in a `categories` collection. The array-index-based PUT/DELETE API is supported by fetching the sorted list and addressing by index.
- **`reviews` as one-document-per-product** — each product's reviews are stored as a single document `{ productId: String, reviews: [...] }` for atomic array pushes.
- **`settings` as a single upserted document** — `findOneAndUpdate` with `upsert: true` and `returnDocument: 'after'`.

---

## Components and Interfaces

### `db.js`

```javascript
// Exports:
async function connectDB(): Promise<void>
function getDb(): Db          // returns shophere Db instance
```

Internal state: a module-level `let db = null` variable assigned after a successful `MongoClient.connect()`.

### `.env`

```
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/shophere
PORT=8080
```

### `server.js` — structural changes

| Removed | Replaced with |
|---|---|
| `dbFile()`, `dbLoad()`, `dbSave()` | `getDb().collection(name)` calls |
| Top-level synchronous data loads | `await seedCollections()` inside `startServer()` |
| `let products = dbLoad(…)` etc. | No module-level data arrays |
| `const DATA_DIR` + `mkdirSync(DATA_DIR)` | Removed |
| `server.listen(PORT, () => {…})` | `await startServer()` pattern |

Route handlers change from synchronous array operations to `async` MongoDB collection calls. The function signatures visible to the HTTP layer are unchanged.

---

## Data Models

All collections reside in the `shophere` database.

### `products`
```json
{
  "_id": ObjectId,
  "id": Number,           // application integer PK, used by all API routes
  "name": String,
  "brand": String,
  "category": String,
  "description": String,
  "price": Number,
  "originalPrice": Number,
  "stock": Number,
  "badge": String,
  "featured": Boolean,
  "rating": Number,
  "reviewCount": Number,
  "images": [{ "url": String, "type": String, "name": String }],
  "videos": [{ "url": String, "type": String, "name": String }],
  "audios": [{ "url": String, "type": String, "name": String }]
}
```

### `orders`
```json
{
  "_id": ObjectId,
  "id": String,           // "ORD000001" format
  "items": Array,
  "total": Number,
  "name": String,
  "phone": String,
  "email": String,
  "address": String,
  "city": String,
  "state": String,
  "pin": String,
  "payment": String,
  "paymentDetail": String,
  "status": String,
  "date": String          // ISO 8601
}
```

### `settings`
Single document — all fields from `DEF_SETTINGS` (`storeName`, `logo`, `primaryColor`, `adminUsername`, `adminPassword`, etc.).

### `banners`
```json
{
  "_id": ObjectId,
  "id": Number,
  "bgGradient": String,
  "bgImage": String,
  "headline": String,
  "subtitle": String,
  "ctaLabel": String,
  "ctaUrl": String,
  "active": Boolean
}
```

### `categories`
```json
{ "_id": ObjectId, "name": String }
```

### `reviews`
```json
{
  "_id": ObjectId,
  "productId": String,
  "reviews": [
    {
      "id": Number,       // Date.now()
      "name": String,
      "rating": Number,
      "text": String,
      "date": String
    }
  ]
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

This feature is a data-layer migration. The dominant correctness concerns are:

- **Counter correctness**: derived IDs are always > all existing IDs
- **Seeding idempotence**: re-running seed on non-empty collections is a no-op
- **CRUD round-trips**: insert → find returns the same document; update → find reflects changes; delete → find returns nothing
- **Cascade correctness**: category rename updates all affected products; review post recalculates product rating correctly
- **Filter correctness**: query filters return exactly the documents matching the predicate

### Property 1: Counter always exceeds all existing IDs

*For any* non-empty collection of product (or banner) documents each containing a numeric `id` field, the derived counter value SHALL equal `Math.max(...ids) + 1`, and SHALL equal `1` when the collection is empty.

**Validates: Requirements 5.1, 5.3, 5.4**

### Property 2: Order counter always exceeds all existing order numeric suffixes

*For any* collection of order documents whose `id` fields follow the `ORDnnnnnn` format, the derived `nextOid` SHALL equal the maximum numeric suffix across all documents plus `1`, and SHALL equal `1` when the collection is empty.

**Validates: Requirements 5.2, 5.4**

### Property 3: Seeding is idempotent on non-empty collections

*For any* collection that already contains at least one document, calling the seed function SHALL leave the document count unchanged.

**Validates: Requirements 4.5**

### Property 4: Product insert-then-fetch round trip

*For any* valid product document inserted via the POST route, fetching that product by its `id` SHALL return a document whose fields match the inserted data.

**Validates: Requirements 6.2, 6.3**

### Property 5: Product filter correctness

*For any* array of product documents and any combination of filter parameters (`category`, `q`, `badge`, `minPrice`, `maxPrice`, `minRating`, `featured`), every document returned by the filtered GET route SHALL satisfy all active filter predicates, and no document satisfying all predicates SHALL be absent from the result.

**Validates: Requirements 6.1**

### Property 6: Order creation decrements stock correctly

*For any* order containing items with quantities, after the order is created the stock of each referenced product SHALL have decreased by exactly the ordered quantity (clamped at 0).

**Validates: Requirements 7.2**

### Property 7: Category rename cascades to all products

*For any* category name that is present in the `categories` collection, after renaming it to a new name, every product document whose `category` field equalled the old name SHALL have `category` equal to the new name, and no product document with a different original category SHALL be affected.

**Validates: Requirements 10.3**

### Property 8: Review rating recalculation invariant

*For any* sequence of reviews posted for a product, the `rating` stored on the product document SHALL equal the arithmetic mean of all review `rating` values rounded to one decimal place, and `reviewCount` SHALL equal the total number of reviews.

**Validates: Requirements 11.2**

### Property 9: Settings upsert is non-destructive

*For any* partial update payload sent to POST /api/settings, the resulting Settings_Doc SHALL contain the submitted fields with their new values AND all pre-existing fields that were not included in the update SHALL remain unchanged.

**Validates: Requirements 8.2**

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| `MONGODB_URI` missing from environment | Log descriptive error, `process.exit(1)` |
| Atlas connection failure | `connectDB()` logs and calls `process.exit(1)` |
| `getDb()` called before `connectDB()` | Throws `Error('DB not initialised')` |
| Route handler DB error | Caught by the existing top-level `try/catch`; responds `500 { error: 'Server error: …' }` |
| Product/order/banner not found by id | Responds `404 { error: 'Not found' }` (existing behaviour preserved) |
| Duplicate category name | Responds `409 { error: 'Already exists' }` (existing behaviour preserved) |

All route handler errors fall through to the existing `catch(err)` block that calls `sendJSON(res, 500, { error: 'Server error: ' + err.message })`, so no new error-handling infrastructure is needed.

---

## Testing Strategy

This migration replaces I/O calls. The primary risk is silent data loss or mutation bugs introduced during the rewrite. The testing strategy uses two complementary layers:

### Unit / Property Tests (pure logic, no network)

Use [fast-check](https://github.com/dubzzz/fast-check) (or the built-in Node test runner with a lightweight PBT library) to verify the pure-logic functions extracted from route handlers:

- Counter derivation (`deriveNextId`, `deriveNextOid`)
- Filter predicate application
- Review rating recalculation
- Category cascade rename (tested against in-memory document arrays)
- Settings merge logic

Each property test MUST run a minimum of **100 iterations**.

Tag format: `// Feature: mongodb-atlas-integration, Property N: <property text>`

### Integration Tests (real Atlas / mock client)

For each API route:
- Use 2–3 representative examples to verify the full HTTP request → MongoDB round trip.
- Tests can use a dedicated test database on the same Atlas cluster or a `mongodb-memory-server` instance.

### What is NOT property-tested

- Atlas connectivity (smoke/integration test only)
- File upload logic (unchanged, already tested implicitly)
- Static file serving (unchanged)
- Razorpay payment flow (external API, integration test with mocks)

### Recommended test file layout

```
tests/
  unit/
    counters.test.js        ← Properties 1, 2
    seeding.test.js         ← Property 3
    filters.test.js         ← Property 5
    orderStock.test.js      ← Property 6
    categoryRename.test.js  ← Property 7
    reviewRating.test.js    ← Property 8
    settingsMerge.test.js   ← Property 9
  integration/
    products.test.js        ← Property 4 + CRUD examples
    orders.test.js
    settings.test.js
    banners.test.js
    categories.test.js
    reviews.test.js
```
