# NexaRank UI

The merchandising console for NexaRank — a browser-based interface for creating and managing search merchandising rules without engineering support.

## Features

- Create PIN, BOOST, BURY, and SYNONYM rules via a clean form UI
- View all active rules in a sortable table
- Enable/disable rules with one click
- Delete rules
- Connects to nexarank-api via REST

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

The app expects nexarank-api to be available at `/nexarank/api/v1`.

## Roadmap

- [ ] Login page with JWT authentication
- [ ] Role-based UI (Merchandiser, Approver, Admin views)
- [ ] Approver queue for pending rules
- [ ] Rule scheduling controls
- [ ] Rule preview panel
- [ ] Rule performance metrics dashboard

## License

Copyright (c) 2026 Anup Ranjan. Licensed under the Apache License 2.0.
See [LICENSE](LICENSE) for details.
