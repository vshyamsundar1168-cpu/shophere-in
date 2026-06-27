# Requirements Document

## Introduction

This feature extends the existing "Store Settings" tab in the ShopHere.in admin panel (`admin.html`) with a comprehensive visual customization suite. Administrators will be able to control typography (font family, size, weight, color) for every page section, tune product card appearance, manage product images without re-entering product data, adjust color theming per section, and select from a curated list of Google Fonts. All changes are persisted through the existing `POST /api/settings` endpoint and are read by the storefront (`index.html`) via `GET /api/settings` on its next page load without requiring a server restart or code change.

## Glossary

- **Admin_Panel**: The `admin.html` page served at `/admin.html`, restricted to authenticated administrators.
- **Storefront**: The `index.html` page and any other public-facing pages that call `GET /api/settings` on load and apply dynamic CSS through `loadSettings()` in `app.js`.
- **Settings_API**: The existing HTTP endpoints `GET /api/settings` and `POST /api/settings` backed by the MongoDB `settings` collection.
- **Visual_Customizer**: The new expanded "Store Settings" UI section inside `admin.html` that contains all controls described in this document.
- **Font_Selector**: A dropdown control in the Visual_Customizer that lists at least 10 Google Fonts for selection.
- **Product_Image_Manager**: The UI panel inside the Admin_Panel that allows adding, replacing, or removing images for an existing product without modifying other product fields.
- **Dynamic_Style_Block**: The `<style id="dynamic-colors">` element injected by `loadSettings()` in `app.js` that applies saved settings as CSS rules.
- **Settings_Object**: The JSON document stored in the MongoDB `settings` collection and returned by `GET /api/settings`.
- **Section**: A named area of the Storefront — one of: `heading`, `body`, `productName`, `productPrice`, `productBrand`, `navigation`, `footer`, `announcementBar`.
- **Badge**: A small colored label on a product card indicating `new`, `deal`, or `hot` status.
- **Google_Fonts_CDN**: The `https://fonts.googleapis.com/css2` endpoint used to load web fonts.

---

## Requirements

### Requirement 1: Typography Controls — Font Family per Section

**User Story:** As an admin, I want to select a different font family for each page section, so that I can create a visually distinct typographic hierarchy on the storefront.

#### Acceptance Criteria

1. THE Visual_Customizer SHALL provide a Font_Selector dropdown for each Section (heading, body, productName, productPrice, productBrand, navigation, footer, announcementBar).
2. THE Font_Selector SHALL contain at least 10 Google Fonts options, including: Inter, Roboto, Open Sans, Lato, Poppins, Montserrat, Raleway, Nunito, Merriweather, and Playfair Display.
3. WHEN an admin selects a font for a Section and saves settings, THE Settings_API SHALL persist the selected font family name under the key `font_<section>` (e.g., `font_heading`, `font_body`) in the Settings_Object.
4. WHEN the Storefront calls `GET /api/settings` on page load and a `font_<section>` key is present, THE Storefront SHALL load the Google Font stylesheet from the Google_Fonts_CDN for every distinct font family present in the Settings_Object before building the Dynamic_Style_Block.
5. WHEN the Google Fonts stylesheet load event fires successfully, THE Dynamic_Style_Block SHALL apply the `font-family` CSS property to the corresponding HTML elements for each Section: `h1,h2,h3,h4,h5,h6` for heading, `body` for body, `.pc-name` for productName, `.pc-price` for productPrice, `.pc-brand` for productBrand, `.nav-inner a` for navigation, `.footer-col` for footer, and `.top-bar,.marquee-bar` for announcementBar.
6. IF the Google_Fonts_CDN is unreachable when the Storefront loads, THEN THE Dynamic_Style_Block SHALL apply the font-family rule using the saved font name with a system-font fallback stack (`sans-serif`) so text remains readable.
7. WHEN no `font_<section>` value is stored in the Settings_Object, THE Dynamic_Style_Block SHALL leave the font-family rule for that Section absent so the base `style.css` default applies.
8. WHERE a global font is selected using the "Apply to All Sections" control, THE Visual_Customizer SHALL update all eight Font_Selector dropdowns to display the selected font before the admin saves, without requiring a page reload.

---

### Requirement 2: Typography Controls — Font Size, Weight, and Text Color per Section

**User Story:** As an admin, I want to control font size, font weight, and text color independently for each page section, so that the storefront typography precisely matches the brand's design.

#### Acceptance Criteria

1. THE Visual_Customizer SHALL provide a numeric font-size input (in pixels, minimum 10, maximum 72) for each Section, stored under key `fontSize_<section>` in the Settings_Object.
2. THE Visual_Customizer SHALL provide a font-weight selector (values: 400 Normal, 500 Medium, 600 Semi-Bold, 700 Bold, 800 Extra-Bold) for each Section, stored under key `fontWeight_<section>`.
3. THE Visual_Customizer SHALL provide a color picker for text color for each Section, storing a 6-digit hex string (e.g., `#1e293b`) under key `textColor_<section>`.
4. WHEN an admin changes font size, weight, or text color for a Section and saves settings, THE Settings_API SHALL persist all three values for that Section in the Settings_Object and return the updated Settings_Object in the response body.
5. WHEN the Storefront calls `GET /api/settings` and a `fontSize_<section>`, `fontWeight_<section>`, or `textColor_<section>` key is present, THE Dynamic_Style_Block SHALL apply the corresponding `font-size`, `font-weight`, and `color` CSS property to the HTML elements defined for that Section (same element mapping as Requirement 1 criterion 5).
6. WHEN a `fontSize_<section>` or `fontWeight_<section>` key is absent from the Settings_Object for a Section, THE Dynamic_Style_Block SHALL omit that CSS property for that Section so the base stylesheet default is preserved.
7. IF a font-size value outside 10–72 or a font-weight value not in {400, 500, 600, 700, 800} or a text color value that is not a valid 6-digit hex string is submitted to `POST /api/settings`, THEN THE Settings_API SHALL return HTTP 400 with a JSON body `{ "error": "<fieldName> is invalid: <reason>" }` and SHALL NOT persist any part of the invalid request.
8. IF `POST /api/settings` fails due to a database error while saving typography values, THEN THE Admin_Panel SHALL display a toast error message containing the server-returned error text.

---

### Requirement 3: Product Card Appearance

**User Story:** As an admin, I want to customize the visual appearance of product cards, so that the product grid matches the store's design language.

#### Acceptance Criteria

1. THE Visual_Customizer SHALL provide a numeric input for product card image height (minimum 80, maximum 600, pixels), stored as `prodImgHeight` in the Settings_Object.
2. THE Visual_Customizer SHALL provide a numeric input for product name font size (minimum 10, maximum 28, pixels), stored as `prodNameSize`.
3. THE Visual_Customizer SHALL provide a numeric input for product price font size (minimum 10, maximum 32, pixels), stored as `prodPriceSize`.
4. THE Visual_Customizer SHALL provide a color picker for product card background color (6-digit hex), stored as `prodCardBg`.
5. THE Visual_Customizer SHALL provide a numeric input for product card border-radius (minimum 0, maximum 32, pixels), stored as `prodCardRadius`.
6. THE Visual_Customizer SHALL provide color pickers for each Badge type: `new` badge background stored as `badgeNewBg`, `deal` badge background stored as `badgeDealBg`, and `hot` badge background stored as `badgeHotBg` (all 6-digit hex).
7. WHEN any product card appearance setting is saved via `POST /api/settings`, THE Settings_API SHALL persist all eight keys (`prodImgHeight`, `prodNameSize`, `prodPriceSize`, `prodCardBg`, `prodCardRadius`, `badgeNewBg`, `badgeDealBg`, `badgeHotBg`) that are present in the request and return the updated Settings_Object.
8. WHEN the Storefront loads settings, THE Dynamic_Style_Block SHALL apply: `height: <prodImgHeight>px` to `.pc-img`; `font-size: <prodNameSize>px` to `.pc-name`; `font-size: <prodPriceSize>px` to `.pc-price .cur`; `background: <prodCardBg>` to `.product-card`; `border-radius: <prodCardRadius>px` to `.product-card`; `background: <badgeNewBg>` to `.pc-badge.new`; `background: <badgeDealBg>` to `.pc-badge.deal`; `background: <badgeHotBg>` to `.pc-badge.hot`.
9. IF any numeric product card value submitted to `POST /api/settings` is outside its defined range or any color value is not a valid 6-digit hex string, THEN THE Settings_API SHALL return HTTP 400 with `{ "error": "<fieldName> is invalid: allowed range <min>–<max>" }` and SHALL NOT persist the valid co-submitted fields from that same request partially — all or nothing per request.

---

### Requirement 4: Product Image Management

**User Story:** As an admin, I want to add, replace, or remove images for an existing product from the admin panel without re-entering all other product details, so that I can keep product imagery up to date efficiently.

#### Acceptance Criteria

1. THE Product_Image_Manager SHALL be accessible from the existing Products table via an "Images" action button rendered on each product row.
2. WHEN the admin opens the Product_Image_Manager for a product, THE Product_Image_Manager SHALL display all currently stored images for that product as thumbnails; IF the product has no images, THE Product_Image_Manager SHALL display an empty-state message "No images yet."
3. THE Product_Image_Manager SHALL provide a file upload control that accepts only JPEG, PNG, and WebP files (MIME types `image/jpeg`, `image/png`, `image/webp`) up to 10 MB each.
4. WHEN the admin selects and uploads one or more new images, THE Admin_Panel SHALL send a `PUT /api/products/:id` multipart request appending the new files; THE Settings_API SHALL add the returned image URLs to the product's `images` array without removing existing images.
5. THE Product_Image_Manager SHALL provide a "Remove" button on each displayed thumbnail.
6. WHEN the admin clicks a "Remove" button, THE Admin_Panel SHALL display a confirmation dialog with the text "Remove this image?" and "Confirm" / "Cancel" buttons; WHEN the admin clicks "Confirm", THE Admin_Panel SHALL send `DELETE /api/products/:id/media` with the image URL and remove the thumbnail from the display.
7. IF an uploaded file exceeds 10 MB or has a MIME type other than `image/jpeg`, `image/png`, or `image/webp`, THEN THE Admin_Panel SHALL display a per-file validation error "File '<name>' is invalid: must be JPEG, PNG or WebP under 10 MB" and SHALL NOT include that file in the upload request.
8. IF a product already has 20 images, THEN THE Admin_Panel SHALL disable the upload control and display the message "Maximum 20 images reached" and SHALL NOT send any upload request.
9. WHEN an upload or removal operation completes successfully, THE Admin_Panel SHALL display a success toast message "Images updated."

---

### Requirement 5: Color Theming per Section

**User Story:** As an admin, I want to change primary, background, card background, button, and link colors for each storefront section, so that I can apply a consistent color theme across the entire store.

#### Acceptance Criteria

1. THE Visual_Customizer SHALL provide a color picker for the global primary brand color stored as `primaryColor` (6-digit hex), which maps to CSS variable `--p`.
2. THE Visual_Customizer SHALL provide a color picker for the global page background color stored as `colorBg` (6-digit hex), which maps to CSS variable `--bg` applied to `body`.
3. THE Visual_Customizer SHALL provide a color picker for the product card background color stored as `prodCardBg` (6-digit hex), which maps to `.product-card { background }`.
4. THE Visual_Customizer SHALL provide color pickers for "Add to Cart" button background stored as `colorBtnCart` and "Buy Now" button background stored as `colorBtnBuy` (both 6-digit hex).
5. THE Visual_Customizer SHALL provide a color picker for the global hyperlink text color stored as `colorLink` (6-digit hex).
6. THE Visual_Customizer SHALL provide color pickers for navigation background stored as `colorNavBg` and footer background stored as `colorFooterBg` (both 6-digit hex).
7. WHEN any color theming value is saved via `POST /api/settings`, THE Settings_API SHALL persist only the color keys present in the request and return the full updated Settings_Object.
8. WHEN the Storefront calls `GET /api/settings` and a color theming key is present, THE Dynamic_Style_Block SHALL apply: `--p: <primaryColor>` to `:root`; `background: <colorBg>` to `body`; `background: <colorBtnCart>` to `.btn-cart`; `background: <colorBtnBuy>` to `.btn-buy`; `color: <colorLink>` to `a`; `background: <colorNavBg>` to `.nav-inner`; `background: <colorFooterBg>` to `footer`.
9. WHEN the admin changes a color value in a color picker, THE Admin_Panel SHALL update the swatch preview of that input to reflect the newly chosen color value immediately, before the admin clicks "Save All Settings".
10. IF a color value submitted to `POST /api/settings` is not a valid 6-digit hex string, THEN THE Settings_API SHALL return HTTP 400 with `{ "error": "<fieldName> must be a valid hex color" }` and SHALL NOT persist any field from that request.

---

### Requirement 6: Font Selection from Google Fonts

**User Story:** As an admin, I want to choose from a curated list of Google Fonts and apply a selection globally or per section, so that I can change the store's typographic style without editing code.

#### Acceptance Criteria

1. THE Font_Selector SHALL list exactly these 10 Google Fonts in order: Inter, Roboto, Open Sans, Lato, Poppins, Montserrat, Raleway, Nunito, Merriweather, Playfair Display.
2. WHEN the Font_Selector dropdown is rendered, EACH option element SHALL have its own `font-family` inline style set to the respective Google Font name so the font name appears rendered in its own typeface.
3. WHEN a font is selected and settings are saved, THE Settings_API SHALL persist the font family name under the key `font_<section>` in the Settings_Object.
4. WHEN the Storefront loads settings and one or more `font_<section>` keys with non-default values are present, THE Storefront SHALL inject one `<link rel="stylesheet">` element per distinct font family pointing to `https://fonts.googleapis.com/css2?family=<FontName>:wght@400;700&display=swap` before executing the Dynamic_Style_Block CSS application logic.
5. WHEN the admin selects a font in the Font_Selector, THE Admin_Panel SHALL update a preview `<span>` element beneath the selector to display the text "The quick brown fox" rendered in the chosen font within the Visual_Customizer panel.
6. THE Visual_Customizer SHALL provide an "Apply Font to All Sections" button adjacent to a global Font_Selector; WHEN clicked, THE Visual_Customizer SHALL set the value of all eight per-section Font_Selector dropdowns to the globally selected font name immediately, before saving.
7. WHEN "Apply Font to All Sections" is triggered, THE Visual_Customizer SHALL update all per-section Font_Selector dropdowns and their preview spans to reflect the chosen font simultaneously.
8. IF the Google_Fonts_CDN stylesheet fails to load (network error or 4xx/5xx response), THEN THE Dynamic_Style_Block SHALL still apply the `font-family` CSS rule using the saved font name with `, sans-serif` as fallback so text remains legible.

---

### Requirement 7: Settings Persistence and Storefront Propagation

**User Story:** As an admin, I want all visual customization changes to be saved to the database and reflected on the storefront on the next page load, so that visitors see an up-to-date design without requiring a server restart.

#### Acceptance Criteria

1. WHEN the admin clicks "Save All Settings" in the Visual_Customizer, THE Admin_Panel SHALL collect all Visual_Customizer field values and submit them to `POST /api/settings` as a single `application/json` or `multipart/form-data` request (multipart only when a logo file is included).
2. WHEN `POST /api/settings` receives visual customization fields, THE Settings_API SHALL persist all received fields into the MongoDB `settings` collection using `findOneAndUpdate` with `{ upsert: true, returnDocument: 'after' }` and return the full updated Settings_Object with HTTP 200.
3. WHEN `GET /api/settings` is called by the Storefront after a successful save, THE Settings_API SHALL return all previously saved visual customization fields in the response JSON.
4. WHEN `loadSettings()` executes on the Storefront after a successful admin save, THE Dynamic_Style_Block SHALL reflect all saved values in CSS on the current page load; visitors who reload the page SHALL see the updated styles without any server restart.
5. WHEN a `POST /api/settings` request omits some visual customization fields, THE Settings_API SHALL apply `$set` only for the fields present in the request body and SHALL NOT change the stored values of absent fields.
6. IF the `POST /api/settings` request does not receive a response within 10 seconds, THEN THE Admin_Panel SHALL display a toast error message "Save timed out — please try again."
7. IF `POST /api/settings` returns a non-2xx HTTP status, THEN THE Admin_Panel SHALL display a toast error message containing the `error` field from the response JSON body.
8. WHEN `POST /api/settings` returns HTTP 200, THE Admin_Panel SHALL display a toast success message "Settings saved."

---

### Requirement 8: Visual Customizer UI Organization

**User Story:** As an admin, I want the visual customization controls to be logically grouped and easy to navigate, so that I can quickly find and adjust any setting without confusion.

#### Acceptance Criteria

1. THE Visual_Customizer SHALL organize controls into four clearly labeled collapsible sub-sections rendered in this order: "Typography", "Product Cards", "Color Theme", and "Fonts".
2. THE Visual_Customizer SHALL render within the existing "Store Settings" tab of the Admin_Panel without requiring navigation to a separate page or tab.
3. WHEN the Visual_Customizer is rendered, THE Admin_Panel SHALL display a single sticky "Save All Settings" button that persists all customization values in one action and remains visible while the admin scrolls through the Visual_Customizer.
4. THE Visual_Customizer SHALL display a helper text label beneath each control describing in plain language the storefront element it affects (e.g., "Applies to all `<h1>`–`<h6>` heading elements on the storefront").
5. WHEN the admin changes any Visual_Customizer field value without saving, THE Admin_Panel SHALL show a visible "Unsaved changes" badge or indicator adjacent to the "Save All Settings" button; WHEN the admin successfully saves, THE Admin_Panel SHALL remove the "Unsaved changes" indicator.
