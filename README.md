# NexaRank UI

The merchandising console for NexaRank — a browser-based interface for creating, reviewing, and managing search merchandising rules without engineering support.

Part of the [SearchX](https://github.com/anupanupranjan-gif/search-infra) open-source eCommerce search platform.

## Features

- Login with JWT authentication
- Role-based navigation (VIEWER, MERCHANDISER, APPROVER, ADMIN)
- Create PIN, BOOST, BURY, and SYNONYM rules via a clean form UI
- Submit rules for review — approval workflow built in
- Approver queue for reviewing and publishing pending rules
- Enable/disable approved rules with one click
- User management panel (ADMIN only — create users, assign roles)
- Reject rules with a reason comment

## Screenshots

### Login
![Login page](https://raw.githubusercontent.com/anupanupranjan-gif/nexarank-ui/main/docs/screenshots/login.png)

### Merchandising Console
![Rules console](https://raw.githubusercontent.com/anupanupranjan-gif/nexarank-ui/main/docs/screenshots/console.png)

## Role Permissions

| Action | VIEWER | MERCHANDISER | APPROVER | ADMIN |
|--------|--------|-------------|---------|-------|
| View rules | Yes | Yes | Yes | Yes |
| Create rules | No | Yes | Yes | Yes |
| Approve/reject | No | No | Yes | Yes |
| Delete rules | No | No | Yes | Yes |
| Manage users | No | No | No | Yes |

## Tech Stack

- React 18
- nginx (production serving)
- Deployed via Kubernetes/Kind

## Quick Start

```bash
git clone https://github.com/anupanupranjan-gif/nexarank-ui.git
cd nexarank-ui
npm install
npm start
```

The app expects nexarank-api at `/nexarank/api/v1`. For local dev, update the `API_BASE` constant in `src/pages/RulesConsole.js`.

## Deployment

```bash
npm run build
docker build -t nexarank-ui:latest .
```

See [nexarank-api](https://github.com/anupanupranjan-gif/nexarank-api) for the backend.

## Roadmap

### Near Term
- [ ] Rule scheduling (activate/expire by date — for promotions and seasonal events)
- [ ] Rule priority ordering and conflict detection
- [ ] Rule preview (simulate results before activating)

### AI Layer
- [ ] AI-suggested rules — analyze zero-result queries and suggest synonyms automatically
- [ ] Clickstream feedback loop — track which rules drive clicks and conversions via Kafka
- [ ] Semantic rule matching — rules fire on query meaning, not just exact keyword match
- [ ] AI assistant panel in Grafana — "why did p95 spike after this rule went live?"

### Platform
- [ ] A/B rule testing with conversion comparison
- [ ] Multi-tenant namespace support (multiple brands/catalogs from one deployment)
- [ ] LDAP/Azure AD authentication for enterprise teams
- [ ] Rule performance metrics dashboard

## License

Copyright (c) 2026 Anup Ranjan. Licensed under the Apache License 2.0.
See [LICENSE](LICENSE) for details.
