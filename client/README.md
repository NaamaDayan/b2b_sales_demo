# Sales Room — React UI

React (Vite) app for the Deal Execution Space with three tabs (Requires Attention, Under Control, Done) and the Agent Reasoning Trace panel.

## Development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. Use the app at the root path (Vite base is `/sales-room/` for production).

## Production build

```bash
npm run build
```

Output is in `dist/`. From the repo root, run `npm run build:client`, then start the server with `npm start`. The server serves the React app at `/sales-room` when `client/dist/index.html` exists.
