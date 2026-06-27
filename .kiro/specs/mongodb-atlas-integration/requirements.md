# Requirements Document

## Introduction

ShopHere.in is a plain Node.js e-commerce server that currently reads and writes all data (products, orders, settings, banners, categories, reviews) from local JSON files in the `data/` directory. This migration replaces that flat-file storage layer with MongoDB Atlas as the persistent database, using the `mongodb` npm driver (v6) that is already installed. All existing API routes, response shapes, and frontend behaviour must remain identical after the migration — no frontend changes are needed.

## Glossary

- **Server**: The plain Node.js HTTP server defined in `server.js`
- **DB_Module**: The new `db.js` module responsible for connecting to MongoDB Atlas and exposing the database instance
- **Atlas**: MongoDB Atlas, the cloud-hosted MongoDB service
- **Collection**: A MongoDB collection — one collection per data type: `products`, `orders`, `settings`, `banners`, `categories`, `reviews`
- **Settings_Doc**: The single document stored in the `settings` collection that holds store-wide configuration
- **Counter**: An in-memory derived value (`nextPid`, `nextOid`, `nextBid`) that tracks the next available numeric ID, derived from the maximum existing ID in the relevant collection
- **Seed_Data**: Default documents written to empty collections on first startup to ensure the store is usable without manual data entry
- **ENV_File**: The `.env` file at the project root containing `MONGODB_URI` and `PORT`

## Requirements

---

### Requirement 1: Environment Configuration

**User Story:** As a developer, I want the MongoDB connection string and port stored in a `.env` file, so that sensitive credentials are not hardcoded in source code.

#### Acceptance Criteria

1. THE Server SHALL read `MONGODB_URI` from the environment at startup
2. THE Server SHALL read `PORT` from the environment at startup and default to `8080` when `PORT` is absent
3. WHEN the `.env` file is present in the project root, THE Server SHALL load it automatically before any other initialisation
4. IF `MONGODB_URI` is absent from the environment, THEN THE Server SHALL log a descriptive error message and exit with a non-zero status code

---

### Requirement 2: Database Connection Module

**User Story:** As a developer, I want a dedicated `db.js` module that manages the MongoDB connection, so that connection logic is isolated and reusable across the codebase.

#### Acceptance Criteria

1. THE DB_Module SHALL export a `connectDB()` async function that establishes a connection to Atlas using the `MONGODB_URI` environment variable
2. THE DB_Module SHALL export a `getDb()` function that returns the active `Db` instance for the database named `shophere`
3. WHEN `connectDB()` is called, THE DB_Module SHALL log a confirmation message to the console upon successful connection
4. IF the Atlas connection attempt fails, THEN THE DB_Module SHALL log the error message to `console.error` and call `process.exit(1)`
5. WHEN `getDb()` is called before `connectDB()` has completed, THE DB_Module SHALL throw an `Error` with the message `"DB not initialised"`

---

### Requirement 3: Async Server Startup

**User Story:** As a developer, I want the HTTP server to start only after the database connection is established, so that no requests are handled before the database is ready.

#### Acceptance Criteria

1. THE Server SHALL wrap its startup sequence in an async `startServer()` function
2. WHEN `startServer()` is called, THE Server SHALL call `connectDB()` and await its completion before calling `server.listen()`
3. IF `connectDB()` rejects, THEN THE Server SHALL allow the rejection to propagate so that `process.exit(1)` is triggered by the DB_Module

---

### Requirement 4: Database Seeding

**User Story:** As a store owner, I want the database to be pre-populated with default data on first launch, so that the store is usable immediately without manual data entry.

#### Acceptance Criteria

1. WHEN the `products` collection is empty at startup, THE Server SHALL insert the 12 default product documents defined in `DEF_PRODUCTS`
2. WHEN the `categories` collection is empty at startup, THE Server SHALL insert the 8 default category strings from `DEF_CATS` as documents in the form `{ name: <string> }`
3. WHEN the `banners` collection is empty at startup, THE Server SHALL insert the 1 default banner document from `DEF_BANNERS`
4. WHEN the `settings` collection contains no document, THE Server SHALL insert the default settings document from `DEF_SETTINGS`
5. WHEN any collection already contains documents at startup, THE Server SHALL leave that collection unmodified

---

### Requirement 5: Counter Initialisation

**User Story:** As a developer, I want auto-increment counters derived from the database on startup, so that new IDs never collide with existing records.

#### Acceptance Criteria

1. WHEN the Server starts, THE Server SHALL derive `nextPid` by querying the maximum numeric `id` field across all documents in the `products` collection and adding 1
2. WHEN the Server starts, THE Server SHALL derive `nextOid` by querying the maximum numeric suffix of the `id` field across all documents in the `orders` collection and adding 1
3. WHEN the Server starts, THE Server SHALL derive `nextBid` by querying the maximum numeric `id` field across all documents in the `banners` collection and adding 1
4. WHEN a collection is empty, THE Server SHALL initialise the corresponding counter to `1`

---

### Requirement 6: Products Collection API

**User Story:** As a developer, I want all product CRUD operations to use the `products` MongoDB collection, so that product data persists in Atlas instead of a JSON file.

#### Acceptance Criteria

1. WHEN `GET /api/products` is requested, THE Server SHALL query the `products` collection and apply all supported filters (`category`, `q`, `sort`, `badge`, `minPrice`, `maxPrice`, `minRating`, `featured`, `page`, `limit`) in the database query or in-process
2. WHEN `GET /api/products/:id` is requested, THE Server SHALL retrieve the single document where `id` equals the numeric path parameter from the `products` collection
3. WHEN `POST /api/products` is requested with a valid name, THE Server SHALL insert a new product document into the `products` collection using the current `nextPid` value and then increment `nextPid`
4. WHEN `PUT /api/products/:id` is requested, THE Server SHALL update the matching document in the `products` collection using the fields provided
5. WHEN `DELETE /api/products/:id` is requested, THE Server SHALL delete the matching document from the `products` collection
6. WHEN `DELETE /api/products/:id/media` is requested, THE Server SHALL update the matching document to remove the specified media URL from `images`, `videos`, or `audios` arrays

---

### Requirement 7: Orders Collection API

**User Story:** As a developer, I want all order operations to use the `orders` MongoDB collection, so that order data persists in Atlas.

#### Acceptance Criteria

1. WHEN `GET /api/orders` is requested, THE Server SHALL retrieve all documents from the `orders` collection, optionally filtered by `status`
2. WHEN `POST /api/orders` is requested, THE Server SHALL insert a new order document using the current `nextOid` value (formatted as `ORD` + six zero-padded digits), decrement stock on matching products in the `products` collection, and then increment `nextOid`
3. WHEN `PUT /api/orders/:id` is requested, THE Server SHALL update the matching document in the `orders` collection with the fields provided

---

### Requirement 8: Settings Collection API

**User Story:** As a developer, I want the store settings to be stored as a single document in the `settings` MongoDB collection, so that admin configuration persists in Atlas.

#### Acceptance Criteria

1. WHEN `GET /api/settings` is requested, THE Server SHALL retrieve the single Settings_Doc from the `settings` collection
2. WHEN `POST /api/settings` is requested, THE Server SHALL apply a `findOneAndUpdate` with `upsert: true` to merge the submitted fields into the Settings_Doc and return the updated document

---

### Requirement 9: Banners Collection API

**User Story:** As a developer, I want banner data to use the `banners` MongoDB collection, so that banner configuration persists in Atlas.

#### Acceptance Criteria

1. WHEN `GET /api/banners` is requested, THE Server SHALL retrieve all documents from the `banners` collection
2. WHEN `POST /api/banners` is requested, THE Server SHALL insert a new banner document using the current `nextBid` value and then increment `nextBid`
3. WHEN `PUT /api/banners/:id` is requested, THE Server SHALL update the matching document in the `banners` collection
4. WHEN `DELETE /api/banners/:id` is requested, THE Server SHALL delete the matching document from the `banners` collection

---

### Requirement 10: Categories Collection API

**User Story:** As a developer, I want category data to use the `categories` MongoDB collection, so that category management persists in Atlas.

#### Acceptance Criteria

1. WHEN `GET /api/categories` is requested, THE Server SHALL retrieve all category names from the `categories` collection as an array of strings
2. WHEN `POST /api/categories` is requested with a non-empty unique name, THE Server SHALL insert a new category document `{ name: <string> }` into the `categories` collection
3. WHEN `PUT /api/categories/:index` is requested, THE Server SHALL rename the category at the given index, update all products in the `products` collection whose `category` matches the old name to use the new name, and return the updated category name
4. WHEN `DELETE /api/categories/:index` is requested, THE Server SHALL remove the category document from the `categories` collection and reassign all products in the `products` collection using that category to `"Uncategorised"`

---

### Requirement 11: Reviews Collection API

**User Story:** As a developer, I want product reviews to use the `reviews` MongoDB collection, so that review data persists in Atlas.

#### Acceptance Criteria

1. WHEN `GET /api/reviews/:productId` is requested, THE Server SHALL retrieve the review document keyed by `productId` from the `reviews` collection and return the `reviews` array within it, or an empty array if no document exists
2. WHEN `POST /api/reviews/:productId` is requested with a valid name and text, THE Server SHALL push the new review into the `reviews` array of the document for that `productId` (creating the document if it does not exist), and then update the matching product document in `products` with the recalculated `rating` and `reviewCount`

---

### Requirement 12: Stats API

**User Story:** As an admin, I want the stats endpoint to reflect live database counts, so that the dashboard shows accurate metrics.

#### Acceptance Criteria

1. WHEN `GET /api/stats` is requested, THE Server SHALL compute `totalProducts`, `totalOrders`, `totalRevenue`, `lowStock`, and `processing` by querying the `products` and `orders` collections
2. THE Server SHALL return the same JSON shape as the current stats endpoint: `{ totalProducts, totalOrders, totalRevenue, lowStock, processing }`

---

### Requirement 13: Removal of File-Based Storage

**User Story:** As a developer, I want all JSON file read/write operations removed from `server.js`, so that the codebase has a single source of truth for data persistence.

#### Acceptance Criteria

1. THE Server SHALL NOT call `dbLoad()` or `dbSave()` after the migration is complete
2. THE Server SHALL NOT call `fs.readFileSync` or `fs.writeFileSync` for any data file in the `data/` directory after the migration is complete
3. THE Server SHALL retain `fs` usage only for file uploads (saving media to `uploads/`) and static file serving
4. THE Server SHALL retain `mkdirSync` calls for `uploads/` directory creation but SHALL NOT create or require the `data/` directory
