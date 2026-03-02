# Alex Slack Bot

Node.js backend for the **Alex** Slack bot: sends a Sales Room DM to the AE on startup (with Block Kit formatting and a link/button), serves a mock **Sales Room** page for reviewing and editing suggested tasks, and echoes messages in the same channel.

---

## 1. Install dependencies

```bash
npm install
```

Requires **Node.js 18+** (uses native `fetch` and ES modules).

---

## 2. Configure environment

**Local:** Copy or edit `.env` in the project root (used only when not running on Lambda).

**AWS Lambda:** Set environment variables in the Lambda function configuration. No `.env` file is used in Lambda.

Variables:

- **SLACK_BOT_TOKEN** – Bot User OAuth Token (`xoxb-...`) from your Slack app (OAuth & Permissions).
- **SLACK_SIGNING_SECRET** – Signing Secret from your Slack app (Basic Information → App Credentials).
- **PORT** – Server port for local runs (default `3000`). Not required for Lambda.
- **SLACK_WELCOME_USER_ID** – Slack user ID (e.g. `U01234567`) that receives the Sales Room DM on startup and when calling `/send-welcome` (the AE, e.g. “james”). Required for the startup DM.
- **SLACK_WELCOME_2_USER_ID** – (Optional) Second user to receive the same welcome DM. When set, both users get the message with the “Review & Approve Plan” button. In Lambda, set as `SLACK_WELCOME_2_USER_ID` or `slack_welcome_2_user_id`.
- **BASE_URL** – (Optional) Base URL for the Sales Room link in the Slack message (e.g. `http://localhost:3000` or your ngrok URL). Defaults to `http://localhost:PORT`.
- **PETER_USER_ID** – (Optional) Slack user ID for **Product Peter**. When set, the real flow runs when the AE clicks “Execute / Activate Alex”: Alex sends the same questions to Peter (and Peter 2 if set); if either replies, the flow continues and the Timeline/task update. In Lambda, set as `PETER_USER_ID` or `peter_user_id`.
- **PETER_2_USER_ID** – (Optional) Slack user ID for **Product Peter 2**. When set, Alex sends messages to both Peter and Peter 2; if either one answers, the flow continues (follow-up and acknowledgment are sent to both). Set in Lambda as `PETER_2_USER_ID` or `peter_2_user_id`.

---

## 3. Customize the DM message

The message the AE receives is read from **`dm-message.txt`** in the project root.

1. Edit `dm-message.txt` with your desired text (plain text; line breaks are preserved).
2. Restart the server (or call `GET /send-welcome`) to resend the DM.

The DM is sent with **Slack Block Kit**: a section block for the main text and a **“Review & Approve Plan”** button that links to the Sales Room (`BASE_URL/sales-room?customer=IBM`).

---

## 4. Run the server

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

The server listens on `http://localhost:3000`. On startup it:

1. Reads the message from `dm-message.txt`
2. Sends a DM to the user(s) in `SLACK_WELCOME_USER_ID` (and `SLACK_WELCOME_2_USER_ID` if set) with Block Kit formatting (section + button linking to the Sales Room).

**Sales Room (mock):** Open [http://localhost:3000/sales-room?customer=IBM](http://localhost:3000/sales-room?customer=IBM) to see the customer panel and Alex’s suggested tasks table (editable task name, due date, people, files; Execute / Activate Alex button).

---

## 5. Expose the local server with ngrok

Slack needs a public URL to send events. Use ngrok to expose your local server:

1. Install ngrok: https://ngrok.com/download (or `choco install ngrok` on Windows, `brew install ngrok` on macOS).

2. Start your server (e.g. `npm start`).

3. In another terminal, run:

   ```bash
   ngrok http 3000
   ```

4. Copy the **HTTPS** URL ngrok shows (e.g. `https://abc123.ngrok.io`).
   - Use `https://abc123.ngrok.io/slack/events` as your Slack Event Subscriptions Request URL.
   - If you want the Slack button to open the Sales Room via ngrok, set **BASE_URL** in `.env` to that URL (e.g. `https://abc123.ngrok.io`).

---

## 6. Configure Slack Event Subscriptions

1. Open your app at https://api.slack.com/apps → select your app.
2. Go to **Event Subscriptions** and turn **Enable Events** **On**.
3. Set **Request URL** to your public endpoint (e.g. `https://<your-ngrok-host>.ngrok.io/slack/events`). Slack will send a `url_verification` request; the server responds with the `challenge`.
4. Under **Subscribe to bot events**, add:
   - **message.channels** – messages in public channels the bot is in.
   - **message.im** – direct messages to the bot.
   - **message.groups** – messages in private channels (if needed).
5. **Save Changes**. Reinstall the app to the workspace if Slack prompts you.
6. Invite the bot to a channel (e.g. `/invite @Alex`) or DM it. Messages you send will be echoed back (existing echo behavior is unchanged).

---

## 7. Deploy to AWS Lambda (Sales Room included)

The app runs as an Express server locally and as a Lambda handler when `AWS_LAMBDA_FUNCTION_NAME` is set. **The Sales Room is served by the same Lambda** at `GET /sales-room`; you do not deploy it separately. API Gateway must forward both Slack events and browser requests to Lambda.

### 7.1 Build and upload the deployment package

Include everything the app needs at runtime:

- `node_modules/` (after `npm install`)
- `server.js`, `slack.js`, `salesRoomDm.js`, `peterFlow.js`, `env.js`
- `dm-message.txt`
- `public/sales-room.html` (the Sales Room page)
- `public/scripted-events-config.js` (pre-scripted Alex demo events; optional, has inline fallback)
- `package.json`

Example (PowerShell, from project root):

```powershell
# From project root
npm install
Compress-Archive -Path node_modules, server.js, slack.js, salesRoomDm.js, env.js, dm-message.txt, public, package.json -DestinationPath lambda-deploy.zip
```

Then upload `lambda-deploy.zip` to your Lambda function (Lambda console → Code → Upload from → .zip file).

### 7.2 Lambda configuration

- **Runtime:** Node.js 18+ (or 20).
- **Handler:** `server.handler` (the default export from `server.js`).
- **Environment variables** (Configuration → Environment variables):
  - `SLACK_BOT_TOKEN` – Bot token.
  - `SLACK_SIGNING_SECRET` – Signing secret.
  - `SLACK_WELCOME_USER_ID` – Slack user ID that receives the Sales Room DM (e.g. AE “james”). Optionally `SLACK_WELCOME_2_USER_ID` for a second recipient.
  - **`BASE_URL`** – **Required for the Sales Room link in Slack.** Set this to your API Gateway base URL (no trailing slash), e.g. `https://abc123xyz.execute-api.us-east-1.amazonaws.com`. The “Review & Approve Plan” button will then open `BASE_URL/sales-room?customer=IBM`.

### 7.3 API Gateway: route all traffic to Lambda

Slack sends **POST** to `/slack/events`. Browsers need **GET** to `/sales-room` and `/send-welcome`. So API Gateway must send **all** (or at least these) requests to the same Lambda.

**Option A – HTTP API (recommended)**  
Create an HTTP API and add a **default** (catch‑all) route that forwards to Lambda:

- Integration: Lambda, select your function.
- Route: `ANY /{proxy+}` or `ANY /$default` (so every path and method goes to Lambda).

Your base URL is then something like:  
`https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com`

**Option B – REST API**  
Create a REST API and a **Lambda proxy** resource:

- Resource path: `/{proxy+}`.
- Method: `ANY` (or add `GET` and `POST` and wire them to the same Lambda).
- Integration: Lambda Proxy.

So in both cases the **Sales Room is deployed** with the same Lambda: users open  
`https://<your-api-id>.execute-api.<region>.amazonaws.com/sales-room?customer=IBM`  
(and you set that base in `BASE_URL` as above).

### 7.4 Slack Event Subscriptions (for Lambda)

1. In your Slack app → **Event Subscriptions** → **Request URL**, set:  
   `https://<your-api-id>.execute-api.<region>.amazonaws.com/slack/events`
2. Save. Slack will call this URL for `url_verification` and for message events; the Lambda responds with the challenge and handles echo.

### 7.5 How to test on AWS Lambda

1. **Sales Room in the browser**  
   Open:  
   `https://<your-api-id>.execute-api.<region>.amazonaws.com/sales-room?customer=IBM`  
   You should see the customer panel and the editable tasks table. If you get 403/404/502, check that API Gateway is routing **GET** requests to your Lambda (e.g. proxy route in §7.3).

2. **Send the Sales Room DM**  
   Lambda does not run “on startup,” so the DM is not sent automatically. Trigger it once:
   - In a browser:  
     `https://<your-api-id>.execute-api.<region>.amazonaws.com/send-welcome`
   - Or with curl:  
     `curl "https://<your-api-id>.execute-api.<region>.amazonaws.com/send-welcome"`  
   The AE(s) (users in `SLACK_WELCOME_USER_ID` and, if set, `SLACK_WELCOME_2_USER_ID`) should get a DM with the message from `dm-message.txt` and the **“Review & Approve Plan”** button. The button should open the Sales Room URL above (only if `BASE_URL` is set correctly).

3. **Echo in Slack**  
   Invite the bot to a channel or DM it. Send a message; the bot should echo it in the same channel/DM. If echo fails, check Slack Event Subscriptions URL and Lambda logs (CloudWatch).

### 7.6 Checklist

| Item | Purpose |
|------|--------|
| `BASE_URL` set in Lambda env | Slack button opens the correct Sales Room URL |
| API Gateway forwards GET (e.g. proxy or GET on /execute-alex) | `/sales-room`, `/send-welcome`, `/execute-alex`, `/alex-real-events` work. **The Sales Room calls GET /execute-alex**—ensure the route allows the GET method. |
| `PETER_USER_ID` set in Lambda env (key: `PETER_USER_ID` or `peter_user_id`) | Real flow: Peter receives DMs and replies update the Sales Room |
| `public/sales-room.html` and `public/scripted-events-config.js` in the zip | Sales Room and scripted demo timeline work |
| Request URL = `.../slack/events` | Slack events and echo work |

---

## Project structure

```
/project-root
  server.js           # Express app, /slack/events, /sales-room, /execute-alex, /alex-real-events, startup Sales Room DM
  slack.js            # Slack API (postMessage, sendDMWithBlocks, openDMChannel) and signature verification
  salesRoomDm.js      # Reads dm-message.txt and builds Block Kit blocks for the DM
  peterFlow.js        # Real Slack flow for Peter (DMs, reply handling, events for Timeline)
  dm-message.txt      # Editable message body for the Sales Room DM (see §3)
  public/
    sales-room.html           # Mock Sales Room (tasks table, Timeline, Execute / Activate Alex)
    scripted-events-config.js # Pre-scripted Alex demo events (edit to change flow; replace for real Slack)
  env.js              # Loads .env only when not on Lambda
  .env                # Local: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, PORT, SLACK_WELCOME_USER_ID, optional SLACK_WELCOME_2_USER_ID, BASE_URL
  package.json
  README.md
```

## Bot behavior

- **Startup (local):** Reads `dm-message.txt`, builds a Slack message with Block Kit (section block + “Review & Approve Plan” button), and sends a DM to `SLACK_WELCOME_USER_ID` (and `SLACK_WELCOME_2_USER_ID` if set) with a link to the Sales Room (`/sales-room?customer=IBM`).
- **Sales Room:** `GET /sales-room` serves a mock page with customer info (e.g. IBM), a pre-filled table of Alex-suggested tasks (Task Name, Files, People, Deadline, Status), inline editing (task name, date, @people, drag & drop files), an **Execute / Activate Alex** button, and a **Timeline / Activity Feed** below the table. No database; mock data only.
- **Pre-scripted (fake) flow:** When the AE clicks “Execute / Activate Alex”, the app runs a list of fake events (from `public/scripted-events-config.js`): send_message, receive_mock_reply, edit_task. Each event runs after its `delay` (ms from start), appends an entry to the Timeline, and updates the task table. No real Slack messages are sent for these.
- **Real flow (Product Peter):** If `PETER_USER_ID` is set, clicking “Execute / Activate Alex” also starts the real flow: Alex sends a first DM to Peter (Block Kit: section + button), then waits for Peter’s reply. When Peter replies in that DM, the server records the reply, adds a “Replied” entry to the Timeline, updates the task `important-feature-request` (Notes and Status), and sends a second question. After Peter’s second reply, the task is marked Completed. The Sales Room polls `GET /alex-real-events` to merge real events into the Timeline and update the task. Only Peter (PETER_USER_ID) is messaged; all other users/channels still get the echo behavior.
- **Messages:** For each non-bot message (no subtype), the bot replies in the same channel with the same text (echo)—except messages from Peter in the real-flow DM, which are handled by the real flow and not echoed.
