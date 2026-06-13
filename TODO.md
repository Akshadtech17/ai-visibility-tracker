# TODO - Connect Frontend to Backend

## Step 1: Ensure frontend endpoint paths exist (no 404)
- [ ] Verify FastAPI router includes `/api/v1/...` with correct prefixes
- [ ] Confirm backend endpoints exist for:
  - [ ] GET `/dashboard`
  - [ ] GET `/competitors/radar`
  - [ ] GET `/visibility/global-map`
  - [ ] POST `/ai/insight`
  - [ ] POST `/simulate/prompt`
  - [ ] POST `/crawl/trigger`
  - [ ] POST `/vectors/realign` (or fix frontend path)

## Step 2: Align WebSocket payloads
- [ ] Ensure `/ws/updates` is included from FastAPI `main.py`
- [ ] Ensure messages include fields frontend reads: `{ type, title?, message, status?, color?, timestamp }`

## Step 3: Make endpoints return frontend-compatible JSON shapes
- [ ] Update dashboard endpoint to return `DashboardMetrics`
- [ ] Update competitors radar endpoint to return `CompetitorRadarData`
- [ ] Update visibility global map endpoint to return `WorldMapData`

## Step 4: Smoke test
- [ ] Run FastAPI dev server
- [ ] Run frontend dev server
- [ ] Verify no 404 in browser Network tab

