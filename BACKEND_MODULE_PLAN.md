# TMS Backend Module Plan

## Token Limit Strategy

The backend will be implemented one module at a time because the full TMS Admin Panel backend is too large to complete safely in one Codex prompt.

Each module must be completed, tested, and committed before moving to the next module. A module is considered complete only when its models, routes, controllers, validation, seed data, frontend integration expectations, and testing checklist are handled.

Old Luumilo/imported backend files must be kept safe, but the new TMS MVP backend must not depend on them. Broken legacy imports should be disabled or isolated during the Foundation module.

## Global Backend Structure

```text
server/
  src/
    config/
    middleware/
    models/
    controllers/
    routes/
    utils/
    seed/
    validators/
  uploads/
  app.js
  server.js
  .env.example
  package.json
```

## Global Rules

- Backend stack: Node.js, Express, MongoDB, and Mongoose.
- All protected routes require JWT.
- Admin role only for MVP.
- Use multer for local document uploads.
- Use local uploads only.
- Do not build real GPS, real AI, payment gateway, or email system in MVP.
- Use MongoDB ObjectId references where needed.
- Use seed data matching frontend mock data.
- Use `asyncHandler`.
- Use centralized error middleware.
- Use consistent API response format.

Success:

```json
{
  "success": true,
  "message": "Success message",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Error message"
}
```

## Module 1: Foundation / Server Boot

Goal: Make backend boot successfully.

### Models Required

- None for initial boot.

### API Routes

- `GET /api/health`

### Controllers

- `healthController.getHealth`

### Seed Data

- None.

### Validation

- Validate required environment variables where needed.
- Allow boot without optional module-specific environment variables.

### Frontend Integration Notes

- Frontend should use the backend base URL, likely `http://localhost:4008/api`.
- Health route confirms API availability before replacing mock data.

### Tasks

- Fix `app.js` and `server.js`.
- Add dotenv config.
- Connect MongoDB.
- Add CORS for frontend `localhost:5173`.
- Add JSON parser.
- Add static uploads folder.
- Add health route.
- Add error middleware.
- Disable broken legacy imports.

### Testing Checklist

- `npm run dev` works.
- `GET /api/health` returns success.
- MongoDB connects.
- Invalid routes return consistent error response.

## Module 2: Auth / Admin Login

Goal: Admin can login and access protected routes.

### Models Required

- `User`

Fields:

- `name`
- `email`
- `password`
- `role`
- `status`

### API Routes

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Controllers

- `authController.login`
- `authController.getMe`
- `authController.logout`

### Seed Data

- Seed default admin user.
- Default credentials: `admin@example.com / password123`

### Validation

- Email is required and must be valid.
- Password is required.
- Only active admin users can login.

### Frontend Integration Notes

- Login returns JWT token and admin profile.
- Frontend stores token and sends `Authorization: Bearer <token>`.
- Logout can be frontend-only for MVP, but route should return success.

### Tasks

- Create `User` model.
- Create JWT helper.
- Create auth middleware.
- Create seed admin script.

### Testing Checklist

- Login returns token.
- `/api/auth/me` works with token.
- Protected route fails without token.
- Wrong password returns consistent error response.

## Module 3: Loads

Goal: Backend for Loads list and load cards.

### Models Required

- `Load`

Fields:

- `loadNumber`
- `customerName`
- `commodity`
- `weight`
- `pickup`
- `delivery`
- `carrier`
- `driver`
- `truck`
- `status`
- `rate`
- `additionalCharges`
- `totalCost`
- `createdAt`

### API Routes

- `GET /api/loads`
- `GET /api/loads/:id`
- `POST /api/loads`
- `PUT /api/loads/:id`
- `DELETE /api/loads/:id`
- `PATCH /api/loads/:id/status`

### Controllers

- `loadController.getLoads`
- `loadController.getLoadById`
- `loadController.createLoad`
- `loadController.updateLoad`
- `loadController.deleteLoad`
- `loadController.updateLoadStatus`

### Seed Data

- Seed loads matching frontend cards and table mock data.
- Include multiple statuses for filters.
- Include linked sample carrier, driver, and truck IDs after those modules exist.

### Validation

- `customerName` required.
- `commodity` required.
- `weight` required.
- `pickup.location`, `pickup.date`, and `pickup.time` required.
- `delivery.location`, `delivery.date`, and `delivery.time` required.
- `rate` required.
- Status must be one of approved frontend statuses.

### Frontend Integration Notes

- Loads page can fetch real loads.
- Search/filter should use query params such as `search`, `status`, `customerName`, `page`, and `limit`.
- Load cards should map directly from the `Load` response.

### Testing Checklist

- Frontend Loads page can fetch real loads.
- Create/update/delete works.
- Status patch works.
- Search/filter can be handled by query params.

## Module 4: Load Details

Goal: Backend for load details tabs.

### Models Required

- `Load`
- `Document`

Subdocuments on `Load`:

- `messages`
- `notes`
- `documents`

Messages:

- `sender`
- `message`
- `createdAt`

Notes:

- `note`
- `createdBy`
- `createdAt`

Documents:

- `documentId`
- `name`
- `status`

### API Routes

- `GET /api/loads/:id`
- `POST /api/loads/:id/messages`
- `POST /api/loads/:id/notes`
- `DELETE /api/loads/:id/notes/:noteId`
- `POST /api/loads/:id/documents`

### Controllers

- `loadDetailsController.getLoadDetails`
- `loadDetailsController.addMessage`
- `loadDetailsController.addNote`
- `loadDetailsController.deleteNote`
- `loadDetailsController.linkDocumentToLoad`

### Seed Data

- Seed loads with messages, notes, and linked document metadata.

### Validation

- Message text is required.
- Note text is required.
- Document ID must be a valid ObjectId.
- Load must exist before adding child records.

### Frontend Integration Notes

- Summary tab gets data from `GET /api/loads/:id`.
- Messages tab can send messages.
- Notes tab can add/delete notes.
- Documents tab can list linked documents.

### Testing Checklist

- Load details page fetches summary data.
- Messages can be added.
- Notes can be added and deleted.
- Documents can be linked and displayed.

## Module 5: Create Load Wizard

Goal: Support frontend create load wizard.

### Models Required

- `Load`

Required sections:

- `basicInfo`
- `pickup`
- `delivery`
- `assignment`
- `pricing`

### API Routes

- `POST /api/loads`

### Controllers

- `loadController.createLoad`

### Seed Data

- No special seed required beyond loads seed.

### Validation

- Customer required.
- Commodity required.
- Weight required.
- Pickup location/date/time required.
- Delivery location/date/time required.
- Carrier/driver optional for MVP.
- Rate required.
- Generate `loadNumber` if frontend does not provide one.

### Frontend Integration Notes

- Wizard payload should map into the same `Load` schema used by the Loads page.
- New load should appear in loads list immediately after create.

### Testing Checklist

- Frontend wizard creates load.
- New load appears in loads list.
- Invalid wizard payload returns validation errors.

## Module 6: Documents

Goal: Upload and manage load/carrier/driver/truck documents.

### Models Required

- `Document`
- `Load`
- `Carrier`
- `Driver`
- `Truck`

Fields:

- `load`
- `loadNumber`
- `carrier`
- `driver`
- `truck`
- `documentType`
- `fileName`
- `originalName`
- `fileUrl`
- `mimeType`
- `size`
- `status`
- `uploadedBy`

### API Routes

- `GET /api/documents`
- `GET /api/documents/load/:loadNumber`
- `POST /api/documents/upload`
- `PATCH /api/documents/:id/status`
- `DELETE /api/documents/:id`

### Controllers

- `documentController.getDocuments`
- `documentController.getDocumentsByLoadNumber`
- `documentController.uploadDocument`
- `documentController.updateDocumentStatus`
- `documentController.deleteDocument`

### Seed Data

- Seed document records linked to sample loads.
- Seed statuses: `Clear`, `Blurry`, `Pending`, `Received`.

### Validation

- Use multer.
- Store in `uploads/documents`.
- Accept PDF, JPG, JPEG, PNG.
- Max 10MB.
- Document type required.
- Status must be valid.

### Frontend Integration Notes

- Upload response should include `fileUrl`.
- Frontend can preview via static uploads URL.
- Documents can be linked to loads by `loadNumber` or load ObjectId.

### Testing Checklist

- Upload works.
- File URL works.
- Documents can be linked to loads.
- Status can be `Clear`, `Blurry`, `Pending`, or `Received`.
- Delete removes document record and local file when possible.

## Module 7: Carriers

Goal: Backend for Carriers list and carrier details.

### Models Required

- `Carrier`
- `Driver`
- `Truck`
- `Document`
- `Load`

Fields:

- `carrierName`
- `phone`
- `email`
- `mcNumber`
- `dotNumber`
- `registrationNumber`
- `address`
- `status`
- `drivers`
- `trucks`
- `documents`
- `activeLoads`
- `onTimeRate`

### API Routes

- `GET /api/carriers`
- `GET /api/carriers/:id`
- `POST /api/carriers`
- `PUT /api/carriers/:id`
- `DELETE /api/carriers/:id`
- `PATCH /api/carriers/:id/status`
- `POST /api/carriers/:id/documents`
- `POST /api/carriers/:id/drivers`

### Controllers

- `carrierController.getCarriers`
- `carrierController.getCarrierById`
- `carrierController.createCarrier`
- `carrierController.updateCarrier`
- `carrierController.deleteCarrier`
- `carrierController.updateCarrierStatus`
- `carrierController.linkCarrierDocument`
- `carrierController.addCarrierDriver`

### Seed Data

- Seed carriers matching frontend mock data.
- Include sample drivers, trucks, active load counts, and document references.

### Validation

- Carrier name required.
- Email must be valid if provided.
- MC/DOT numbers optional for MVP.
- Status must be valid.

### Frontend Integration Notes

- Carriers page fetches list data.
- Carrier details page should receive populated drivers, trucks, documents, and active loads where useful.

### Testing Checklist

- Carriers page fetches data.
- Carrier details page works.
- Carrier documents work.
- Carrier drivers work.
- Add/edit/delete carrier works.

## Module 8: Drivers

Goal: Backend for Drivers module.

### Models Required

- `Driver`
- `Carrier`
- `Truck`
- `Load`
- `Document`

Fields:

- `driverName`
- `phone`
- `email`
- `licenseNumber`
- `licenseExpiry`
- `licenseAlert`
- `assignedTruck`
- `assignedLoads`
- `availabilityStatus`
- `liveLocation`
- `documents`

### API Routes

- `GET /api/drivers`
- `GET /api/drivers/:id`
- `POST /api/drivers`
- `PUT /api/drivers/:id`
- `DELETE /api/drivers/:id`
- `PATCH /api/drivers/:id/status`

### Controllers

- `driverController.getDrivers`
- `driverController.getDriverById`
- `driverController.createDriver`
- `driverController.updateDriver`
- `driverController.deleteDriver`
- `driverController.updateDriverStatus`

### Seed Data

- Seed drivers matching frontend mock data.
- Include license expiry cases for alerts.
- Include assigned truck/load references where possible.

### Validation

- Driver name required.
- Phone required if frontend expects it.
- Email must be valid if provided.
- License expiry must be a valid date if provided.
- Availability status must be valid.

### Frontend Integration Notes

- Drivers page works from `GET /api/drivers`.
- Details view uses `GET /api/drivers/:id`.
- Assigned truck/load values should be returned with enough display fields.

### Testing Checklist

- Drivers page works.
- Add/edit/delete driver works.
- Driver details data is available.
- Status update works.

## Module 9: Trucks

Goal: Backend for Trucks module.

### Models Required

- `Truck`
- `Driver`
- `Carrier`
- `Load`
- `Document`

Fields:

- `vehicleNumber`
- `driver`
- `equipmentTypes`
- `trackingType`
- `status`
- `activeLoads`
- `currentLocation`
- `documents`
- `onTimeRate`

### API Routes

- `GET /api/trucks`
- `GET /api/trucks/:id`
- `POST /api/trucks`
- `PUT /api/trucks/:id`
- `DELETE /api/trucks/:id`
- `PATCH /api/trucks/:id/status`

### Controllers

- `truckController.getTrucks`
- `truckController.getTruckById`
- `truckController.createTruck`
- `truckController.updateTruck`
- `truckController.deleteTruck`
- `truckController.updateTruckStatus`

### Seed Data

- Seed trucks matching frontend mock data.
- Include different statuses and equipment types.
- Include assigned drivers where possible.

### Validation

- Vehicle number required.
- Equipment types should be an array.
- Tracking type must be valid.
- Status must be valid.

### Frontend Integration Notes

- Trucks page works from `GET /api/trucks`.
- Details view uses `GET /api/trucks/:id`.
- Current location can be plain mock text for MVP.

### Testing Checklist

- Trucks page works.
- Add/edit/delete truck works.
- Truck details data is available.
- Status update works.

## Module 10: Truck Need Cover

Goal: Backend for available trucks and load assignment.

### Models Required

- `Truck`
- `Load`
- `Driver`
- `Carrier`

### API Routes

- `GET /api/truck-need-cover`
- `PATCH /api/truck-need-cover/:truckId/assign`

### Controllers

- `truckNeedCoverController.getAvailableTrucks`
- `truckNeedCoverController.assignTruckToLoad`

### Seed Data

- Seed available trucks.
- Seed loads that need truck coverage.

### Validation

- Truck ID must be valid.
- Load ID required for assignment.
- Truck must be available.
- Load must exist and be assignable.

### Frontend Integration Notes

- Available truck list comes from Truck + Load models.
- Assign action updates the selected load and truck.

### Testing Checklist

- Available truck list works.
- Assign truck to load works.
- Truck status updates.
- Load assignment fields update.

## Module 11: Live Tracking

Goal: Mock live tracking backend.

### Models Required

- `Tracking`
- `Truck`
- `Driver`
- `Load`

Fields:

- `truckId`
- `driverName`
- `loadId`
- `currentLocation`
- `eta`
- `speed`
- `status`
- `trackingType`
- `routeProgress`
- `pickup`
- `delivery`
- `distance`
- `lastUpdate`

### API Routes

- `GET /api/tracking`
- `GET /api/tracking/:truckId`
- `PATCH /api/tracking/:truckId/location`

### Controllers

- `trackingController.getTrackingList`
- `trackingController.getTruckTracking`
- `trackingController.updateTruckLocation`

### Seed Data

- Seed tracking records for active trucks.
- Include multiple statuses for filters.

### Validation

- Truck ID must be valid.
- Location update requires `currentLocation`.
- Speed and route progress must be numeric if provided.

### Frontend Integration Notes

- Live tracking page fetches mock truck tracking data.
- Status filters should work via query params.
- No real GPS integration in MVP.

### Testing Checklist

- Live tracking page fetches trucks.
- Status filters work.
- Mock location update works.

## Module 12: Accounting

Goal: Backend for Accounting module.

### Models Required

- `Accounting`
- `Load`
- `Carrier`

Fields:

- `load`
- `customerName`
- `carrierName`
- `customerBilling`
- `carrierPayment`
- `overallStatus`
- `invoiceNumber`
- `amount`
- `disputeStatus`

### API Routes

- `GET /api/accounting`
- `GET /api/accounting/:id`
- `PATCH /api/accounting/:id/status`

### Controllers

- `accountingController.getAccountingRecords`
- `accountingController.getAccountingRecordById`
- `accountingController.updateAccountingStatus`

### Seed Data

- Seed accounting records for sample loads.
- Include billing, payment, paid, pending, and dispute examples.

### Validation

- Accounting record ID must be valid.
- Status must be valid.
- Amount fields must be numeric.

### Frontend Integration Notes

- Accounting table works from `GET /api/accounting`.
- Financial details modal uses `GET /api/accounting/:id`.

### Testing Checklist

- Accounting table works.
- Financial details modal gets data.
- Status update works.

## Module 13: Direct Bills

Goal: Backend for customer invoices/direct bills.

### Models Required

- `DirectBill`
- `Load`

Fields:

- `load`
- `customerName`
- `invoiceNumber`
- `invoiceDate`
- `dueDate`
- `amount`
- `paymentStatus`
- `documentUrl`

### API Routes

- `GET /api/direct-bills`
- `GET /api/direct-bills/:id`
- `PATCH /api/direct-bills/:id/payment-status`

### Controllers

- `directBillController.getDirectBills`
- `directBillController.getDirectBillById`
- `directBillController.updatePaymentStatus`

### Seed Data

- Seed direct bill records linked to sample loads.
- Include document URLs pointing to seeded/local placeholder documents if available.

### Validation

- Direct bill ID must be valid.
- Payment status must be valid.
- Amount must be numeric.

### Frontend Integration Notes

- Direct Bills page works from `GET /api/direct-bills`.
- Invoice preview can use seeded data.

### Testing Checklist

- Direct Bills page works.
- Invoice preview can use seeded data.
- Payment status update works.

## Module 14: Factoring

Goal: Backend for factoring records.

### Models Required

- `Factoring`
- `Load`
- `Carrier`

Fields:

- `load`
- `carrierName`
- `factoringCompany`
- `invoiceNumber`
- `submissionDate`
- `paymentStatus`
- `amount`
- `documentsStatus`

### API Routes

- `GET /api/factoring`
- `GET /api/factoring/:id`
- `PATCH /api/factoring/:id/status`

### Controllers

- `factoringController.getFactoringRecords`
- `factoringController.getFactoringRecordById`
- `factoringController.updateFactoringStatus`

### Seed Data

- Seed factoring records linked to loads and carriers.
- Include different payment and document statuses.

### Validation

- Factoring record ID must be valid.
- Status must be valid.
- Amount must be numeric.

### Frontend Integration Notes

- Factoring list works from `GET /api/factoring`.
- Factoring details modal uses `GET /api/factoring/:id`.

### Testing Checklist

- Factoring list works.
- Factoring details modal works.
- Status update works.

## Module 15: Settlement

Goal: Backend for settlement/invoice summary.

### Models Required

- `Settlement`
- `Load`
- `Carrier`

Fields:

- `carrierName`
- `load`
- `invoiceNumber`
- `status`
- `amount`
- `approvalStatus`

### API Routes

- `GET /api/settlements`
- `GET /api/settlements/:id`
- `PATCH /api/settlements/:id/status`

### Controllers

- `settlementController.getSettlements`
- `settlementController.getSettlementById`
- `settlementController.updateSettlementStatus`

### Seed Data

- Seed settlement records for sample carriers and loads.
- Include approved, pending, and rejected examples.

### Validation

- Settlement ID must be valid.
- Status must be valid.
- Approval status must be valid.
- Amount must be numeric.

### Frontend Integration Notes

- Settlement page works from `GET /api/settlements`.
- Statement preview gets seeded data.

### Testing Checklist

- Settlement page works.
- Approval/status update works.
- Statement preview gets seeded data.

## Module 16: Dashboard

Goal: Dashboard summary API using all module data.

### Models Required

- `Load`
- `Carrier`
- `Driver`
- `Truck`
- `Accounting`
- `DirectBill`
- `Factoring`
- `Settlement`

### API Routes

- `GET /api/dashboard/summary`

### Controllers

- `dashboardController.getDashboardSummary`

### Return

- `planSummary`
- `shipSummary`
- `billSummary`
- `weeklySales`
- `weeklyMargin`
- `billing`
- `topCustomers`
- `leaderboard`
- `totalShipments`

### Seed Data

- Dashboard should calculate from seeded module data.
- Seed enough loads, customers, carriers, and accounting records to populate charts.

### Validation

- Protected route only.
- Optional query params for date range should validate dates if added.

### Frontend Integration Notes

- Dashboard gets calculated data.
- No hardcoded frontend dashboard data needed after this module.

### Testing Checklist

- Dashboard summary returns all expected keys.
- Values are calculated from MongoDB records.
- Empty database returns safe zero/default summaries.

## Final Integration Plan

After all backend modules:

- Create frontend axios service.
- Replace mock data module by module.
- Add loading and error states.
- Test all screens.

## Implementation Order

Use this exact order:

1. Foundation
2. Auth
3. Loads
4. Documents
5. Carriers
6. Drivers
7. Trucks
8. Truck Need Cover
9. Live Tracking
10. Accounting
11. Direct Bills
12. Factoring
13. Settlement
14. Dashboard

After this plan is reviewed, implement Module 1 only. Do not implement all modules at once.
