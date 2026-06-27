# Implementation Plan: MongoDB Atlas Integration

## Overview

Migrate ShopHere.in's data layer from flat JSON files to MongoDB Atlas. Work proceeds in six steps: environment setup → DB module → server wiring → seeding & counters → route-by-route migration → cleanup. Each step builds on the previous one and is independently testable.

The implementation language is **JavaScript (Node.js)**, matching the existing codebase. The `mongodb` v6 driver is already installed. A `dotenv` package will be added to load `.env`.

---

## Tasks

- [x] 1. Set up environment and install dotenv
  - Create `.env` at the project root with:
    ```
    MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/shophere
    PORT=8080
    ```
  - Run `npm install dotenv` and add `"dotenv": "^16.0.0"` (exact version) to `package.json`
  - Add `.env` to `.gitignore` (it already exists, verify `*.env` or `.env` is listed)
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Create `db.js` — MongoDB connection module
  - [x] 2.1 Implement `connectDB()` and `getDb()` in a new `db.js` file
    - Use `MongoClient` from the `mongodb` package
    - Store the client and db reference in module-level variables
    - `connectDB()` reads `process.env.MONGODB_URI`, connects, selects the `shophere` database, logs success
    - `connectDB()` catches errors, logs to `console.error`, calls `process.exit(1)`
    - `getDb()` throws `Error('DB not initialised')` if called before `connectDB()`
    - Export both functions
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 2.2 Write unit tests for `getDb()` guard logic
    - Test: calling `getDb()` before `connectDB()` throws `"DB not initialised"`
    - Test: after mock-connecting, `getDb()` returns the db instance
    - _Requirements: 2.5_

- [x] 3. Wire async startup into `server.js`
  - [x] 3.1 Add `require('dotenv').config()` as the very first statement in `server.js`
    - _Requirements: 1.3_
  - [x] 3.2 Add `require('./db')` import and wrap server startup in `async function startServer()`
    - Move `server.listen(PORT, …)` inside `startServer()`
    - Call `await connectDB()` before `server.listen()`
    - Call `startServer()` at the bottom of the file (replacing the bare `server.listen`)
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Implement database seeding and counter derivation
  - [x] 4.1 Write `async function seedCollections(db)` inside `server.js` (or a helper module)
    - For each collection (`products`, `categories`, `banners`, `settings`): check `countDocuments()` and insert defaults only when count is 0
    - `products`: insert `DEF_PRODUCTS` array
    - `categories`: insert `DEF_CATS.map(name => ({ name }))` array
    - `banners`: insert `DEF_BANNERS` array
    - `settings`: insert `DEF_SETTINGS` object
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 4.2 Write `async function deriveCounters(db)` inside `server.js`
    - `nextPid`: use `aggregate` `$group $max` on `id` field of `products`; default to 0 if empty, add 1
    - `nextOid`: fetch all order `id` strings, parse numeric suffix, take max, default to 0, add 1
    - `nextBid`: same pattern as `nextPid` but on `banners`
    - Assign results to module-level `let nextPid`, `let nextOid`, `let nextBid`
    - Call `await seedCollections(db)` then `await deriveCounters(db)` inside `startServer()`, before `server.listen()`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 4.3 Write property tests for counter derivation logic
    - Extract the counter math as a pure function (e.g., `deriveNextNumericId(ids)`)
    - **Property 1: Counter always exceeds all existing IDs** — for any non-empty array of numeric ids, `deriveNextNumericId(ids) === Math.max(...ids) + 1`
    - **Property 2: Order counter always exceeds all existing order numeric suffixes** — for any array of `ORDnnnnnn` strings, the derived counter equals max suffix + 1
    - Edge case: empty array returns 1
    - Run minimum 100 iterations per property
    - `// Feature: mongodb-atlas-integration, Property 1: Counter always exceeds all existing IDs`
    - `// Feature: mongodb-atlas-integration, Property 2: Order counter always exceeds all existing order numeric suffixes`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 4.4 Write unit test for seeding idempotence
    - **Property 3: Seeding is idempotent on non-empty collections** — mock a collection with existing docs; calling seed should NOT call `insertMany`
    - `// Feature: mongodb-atlas-integration, Property 3: Seeding is idempotent on non-empty collections`
    - _Requirements: 4.5_

- [x] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Migrate Products routes
  - [x] 6.1 Replace in-memory `products` array with MongoDB collection calls in all products routes
    - `GET /api/products`: build a MongoDB filter object from query params; use `find(filter).toArray()` for the result set; apply sort in-process (or via cursor `.sort()`); apply pagination with `.skip().limit()`
    - `GET /api/products/:id`: `collection.findOne({ id: +pm[1] })`; merge with reviews via separate `reviews` collection lookup
    - `POST /api/products`: `collection.insertOne({ id: nextPid++, …fields, …media })` — then increment counter
    - `PUT /api/products/:id`: `collection.findOneAndUpdate({ id: +pm[1] }, { $set: updated }, { returnDocument: 'after' })`
    - `DELETE /api/products/:id`: `collection.deleteOne({ id: +pm[1] })`
    - `DELETE /api/products/:id/media`: `collection.updateOne({ id: +pmd[1] }, { $pull: { images: { url }, videos: { url }, audios: { url } } })`
    - Remove the in-memory `let products` variable
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 6.2 Write property tests for product filter logic
    - Extract the filter-building logic as a pure function `buildProductFilter(params)`
    - **Property 5: Product filter correctness** — for any array of products and filter params, every returned product satisfies all active predicates and no matching product is absent
    - `// Feature: mongodb-atlas-integration, Property 5: Product filter correctness`
    - _Requirements: 6.1_

  - [ ]* 6.3 Write integration test for product insert-then-fetch round trip
    - **Property 4: Product insert-then-fetch round trip** — insert a product via POST, then GET by id, verify fields match
    - `// Feature: mongodb-atlas-integration, Property 4: Product insert-then-fetch round trip`
    - _Requirements: 6.2, 6.3_

- [x] 7. Migrate Orders routes
  - [x] 7.1 Replace in-memory `orders` array with MongoDB collection calls in all orders routes
    - `GET /api/orders`: `collection.find(statusFilter).sort({ date: -1 }).toArray()`
    - `POST /api/orders`: insert order document; for each item decrement stock via `products.updateOne({ id }, { $inc: { stock: -qty } }, min 0 via `$max: 0` or JS clamp); increment `nextOid`
    - `PUT /api/orders/:id`: `orders.findOneAndUpdate({ id: om[1] }, { $set: body })`
    - Remove the in-memory `let orders` variable
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 7.2 Write property test for order stock decrement
    - Extract the stock-decrement logic as a pure function `applyStockDecrements(products, items)`
    - **Property 6: Order creation decrements stock correctly** — for any product list and order items, stock decreases by ordered qty, never below 0
    - `// Feature: mongodb-atlas-integration, Property 6: Order creation decrements stock correctly`
    - _Requirements: 7.2_

- [x] 8. Migrate Settings route
  - [x] 8.1 Replace in-memory `settings` object with MongoDB collection calls
    - `GET /api/settings`: `collection.findOne({})` — return the single document (strip `_id`)
    - `POST /api/settings`: build `$set` object from submitted fields; `collection.findOneAndUpdate({}, { $set }, { upsert: true, returnDocument: 'after' })`; handle logo upload same as before; return updated doc
    - Remove the in-memory `let settings` variable
    - _Requirements: 8.1, 8.2_

  - [ ]* 8.2 Write property test for settings merge
    - Extract merge logic as a pure function `mergeSettings(existing, updates)`
    - **Property 9: Settings upsert is non-destructive** — for any existing settings doc and partial update, merged result contains all update fields AND all untouched fields unchanged
    - `// Feature: mongodb-atlas-integration, Property 9: Settings upsert is non-destructive`
    - _Requirements: 8.2_

- [x] 9. Migrate Banners and Categories routes
  - [x] 9.1 Replace in-memory `banners` array with MongoDB collection calls
    - `GET /api/banners`: `collection.find().toArray()`
    - `POST /api/banners`: `collection.insertOne({ id: nextBid++, …fields })`
    - `PUT /api/banners/:id`: `collection.updateOne({ id }, { $set: body })`
    - `DELETE /api/banners/:id`: `collection.deleteOne({ id })`
    - Remove the in-memory `let banners` variable
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 9.2 Replace in-memory `cats` array with MongoDB collection calls
    - `GET /api/categories`: `collection.find().toArray()` → map to array of name strings
    - `POST /api/categories`: check uniqueness with `findOne({ name: caseInsensitiveRegex })`; insert `{ name }`
    - `PUT /api/categories/:index`: fetch sorted list by index, rename document, cascade-update products
    - `DELETE /api/categories/:index`: fetch sorted list by index, delete document, cascade-reassign products to `"Uncategorised"` (ensure that category exists first)
    - Remove the in-memory `let cats` variable
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 9.3 Write property test for category rename cascade
    - Extract cascade logic as a pure function `applyCategoryRename(products, oldName, newName)`
    - **Property 7: Category rename cascades to all products** — for any product list and rename, every product with old name has new name; others unchanged
    - `// Feature: mongodb-atlas-integration, Property 7: Category rename cascades to all products`
    - _Requirements: 10.3_

- [x] 10. Migrate Reviews route and update Stats endpoint
  - [x] 10.1 Replace in-memory `reviews` object with MongoDB collection calls
    - `GET /api/reviews/:productId`: `collection.findOne({ productId: rm[1] })` → return `doc.reviews || []`
    - `POST /api/reviews/:productId`: `collection.findOneAndUpdate({ productId: pid }, { $push: { reviews: { $each: [rev], $position: 0 } } }, { upsert: true, returnDocument: 'after' })`; recalculate rating and reviewCount; update product document via `products.updateOne`
    - Remove the in-memory `let reviews` variable
    - _Requirements: 11.1, 11.2_

  - [ ]* 10.2 Write property test for review rating recalculation
    - Extract rating math as a pure function `calcRating(reviews)`
    - **Property 8: Review rating recalculation invariant** — for any non-empty array of reviews, `calcRating` returns `round(mean(ratings), 1)` and the count equals `reviews.length`
    - `// Feature: mongodb-atlas-integration, Property 8: Review rating recalculation invariant`
    - _Requirements: 11.2_

  - [x] 10.3 Update `GET /api/stats` to query collections
    - `totalProducts`: `products.countDocuments()`
    - `totalOrders`: `orders.countDocuments()`
    - `totalRevenue`: `orders.aggregate([{ $group: { _id: null, sum: { $sum: '$total' } } }])`
    - `lowStock`: `products.countDocuments({ stock: { $gt: 0, $lte: 10 } })`
    - `processing`: `orders.countDocuments({ status: 'Processing' })`
    - _Requirements: 12.1, 12.2_

- [x] 11. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Remove all file-based storage code
  - [x] 12.1 Delete the `dbFile()`, `dbLoad()`, and `dbSave()` functions from `server.js`
    - Confirm no remaining call sites for these functions
    - Remove `const DATA_DIR` declaration and `fs.mkdirSync(DATA_DIR, …)` call
    - Verify `fs` is still imported (needed for uploads and static serving)
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 12.2 Remove the `DEF_*` constant declarations from `server.js`
    - The seed constants are no longer needed in `server.js` after being moved to the seed function (or they can be inlined there)
    - _Requirements: 13.1_

- [ ] 13. Final checkpoint — Verify full integration
  - Start the server with `node server.js` and confirm it connects to Atlas and logs the startup URLs
  - Spot-check each major API path: GET /api/products, POST /api/products, GET /api/settings, POST /api/orders
  - Verify previously-existing product data appears (migrated from JSON or re-seeded if needed)
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster migration with no tests.
- All route handler `async/await` changes must include the existing top-level `try/catch` — no new error infrastructure is needed.
- The `_id` field added by MongoDB should be stripped from API responses (use destructuring `const { _id, ...doc } = result` or projection `{ _id: 0 }`) to avoid breaking the frontend.
- Because `categories` is stored as documents but the PUT/DELETE API uses array indices, fetch the full sorted array and address by index; this is safe for a single-user admin panel.
- Property tests can be run with `node --test` (Node 18+) or any preferred test runner such as `vitest --run`.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3"] },
    { "wave": 4, "tasks": ["4"] },
    { "wave": 5, "tasks": ["5"] },
    { "wave": 6, "tasks": ["6", "7", "8", "9", "10"] },
    { "wave": 7, "tasks": ["11"] },
    { "wave": 8, "tasks": ["12"] },
    { "wave": 9, "tasks": ["13"] }
  ]
}
```
