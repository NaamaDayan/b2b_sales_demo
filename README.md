# Demi Slack Bot

Node.js backend for the **Demi** Slack bot: sends a Sales Room DM to the AE on startup (with Block Kit formatting and a link/button), serves a mock **Sales Room** page for reviewing and editing suggested tasks, and echoes messages in the same channel.

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
- **JAMES_USER_ID** – Slack user ID (e.g. `U01234567`) that receives the Sales Room DM on startup and when calling `/send-welcome` (the AE, e.g. James). Required for the startup DM.
- **JAMES_2_USER_ID** – (Optional) Second user to receive the same welcome DM. When set, both users get the message with the “Review & Approve Plan” button.- **BASE_URL** – (Optional) Base URL for the Sales Room link in the Slack message (e.g. `http://localhost:3000` or your ngrok URL). Defaults to `http://localhost:PORT`.
- **JORDAN_USER_ID** – (Optional) Slack user ID for **Jordan** (Product). When set, the real flow runs when the AE clicks “Execute / Activate Demi”: Demi sends the same questions to Jordan (and Jordan 2 if set); if either replies, the flow continues. For the Sales Room task “Important Feature Request”, this is the user (Jordan) who receives the SCIM feature request for approval.- **JORDAN_2_USER_ID** – (Optional) Slack user ID for **Jordan 2**. When set, Demi sends messages to both Jordan and Jordan 2; if either one answers, the flow continues.
- **DAN_SECURITY_USER_ID** – (Optional) Slack user ID for **Dan (Security)** in the “Important Feature Request” flow. When Jordan approves but requests Security sign-off, In the current flow Dan is simulated (no real DM); the trace shows "Sent to Dan" and "Received approval from Dan" after a short delay.
- **FLOW_STATE_FILE** – (Optional) Path to a file where the Important Feature Request flow state is saved (e.g. local or EFS). See "What is an instance?" below.
- **FLOW_STATE_S3_BUCKET** – (Optional) **Simplest on Lambda:** an S3 bucket name. When set, flow state is stored in S3 so all Lambda containers share it (no VPC/EFS). **Setup:** [docs/FLOW_STATE_S3_SETUP.md](docs/FLOW_STATE_S3_SETUP.md).

### What is an "instance"?

An **instance** is one running copy of your server. **Locally:** one `npm run dev` process = one instance; all requests share the same memory. **Lambda:** each request can run in a different container; the container that started the flow has the state, but Jordan's reply might be handled by another container with no state. To make the bot always answer (no echo, correct reply) no matter which instance handles the reply, use a shared store: **FLOW_STATE_S3_BUCKET** (simplest on Lambda; see [docs/FLOW_STATE_S3_SETUP.md](docs/FLOW_STATE_S3_SETUP.md)) or **FLOW_STATE_FILE** with a path on EFS (see [docs/FLOW_STATE_AWS_SETUP.md](docs/FLOW_STATE_AWS_SETUP.md)). For single-container or low-traffic Lambda, in-memory state may be enough and you can leave both unset.

---

## 3. Customize the DM and flow messages

The message the AE receives is from **`feature-request-messages.txt`** (DM_MESSAGE). Flow messages (Jordan/James) are in **`config/slackMessages.js`**. See [docs/IMPORTANT_FEATURE_REQUEST_FLOW.md](docs/IMPORTANT_FEATURE_REQUEST_FLOW.md).

1. Edit `feature-request-messages.txt` for the welcome DM; edit `config/slackMessages.js` for Slack flow messages.
2. Restart the server (or call `GET /send-welcome`) to resend the DM.

The DM is sent with **Slack Block Kit**: a section block for the main text and a **“Review & Approve Plan”** button that links to the Sales Room (`BASE_URL/sales-room?customer=ACME`).

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

1. Reads the message from `feature-request-messages.txt` (DM_MESSAGE)
2. Sends a DM to the user(s) in `JAMES_USER_ID` (and `JAMES_2_USER_ID` if set) with Block Kit formatting (section + button linking to the Sales Room).

**Sales Room:** Open [http://localhost:3000/sales-room?customer=ACME](http://localhost:3000/sales-room?customer=ACME) to see the customer panel and Demi’s suggested tasks table to start the real Slack flow.

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
6. Invite the bot to a channel (e.g. `/invite @Demi`) or DM it. Messages you send will be echoed back (existing echo behavior is unchanged).

---

## 7. Deploy to AWS Lambda (Sales Room included)

The app runs as an Express server locally and as a Lambda handler when `AWS_LAMBDA_FUNCTION_NAME` is set. **The Sales Room is served by the same Lambda** at `GET /sales-room`; you do not deploy it separately. API Gateway must forward both Slack events and browser requests to Lambda.

### 7.1 Build and upload the deployment package

Include everything the app needs at runtime:

- `node_modules/` (after `npm install`)
- `server.js`, `slack.js`, `salesRoomDm.js`, `featureRequestFlow.js`, `flowStateStore.js`, `env.js`, `botMessages.js`
- `config/` (e.g. `config/slackMessages.js`, `config/featureRequestTraceSteps.js`)
- `feature-request-messages.txt`
- `public/sales-room.html`, `public/scripted-events-config.js` (optional; scripted-events is legacy)
- `package.json`

Example (PowerShell, from project root):

```powershell
# From project root
npm install
Compress-Archive -Path node_modules, server.js, slack.js, salesRoomDm.js, featureRequestFlow.js, flowStateStore.js, env.js, botMessages.js, config, feature-request-messages.txt, public, package.json -DestinationPath lambda-deploy.zip
```

Then upload `lambda-deploy.zip` to your Lambda function (Lambda console → Code → Upload from → .zip file).

**If you get "Internal Server Error" when clicking Execute on Important Feature Request:** Ensure the **`config/`** folder is included in the zip (`config/slackMessages.js`, `config/featureRequestTraceSteps.js`). If it is missing, the flow module fails to load and Lambda returns a generic 500. Check CloudWatch Logs for the exact error (e.g. "Cannot find module './config/slackMessages.js'").

### 7.2 Lambda configuration

- **Runtime:** Node.js 18+ (or 20).
- **Handler:** `server.handler` (the default export from `server.js`).
- **Timeout:** Set the Lambda timeout to **at least 15–30 seconds**. The Important Feature Request flow makes several Slack API calls (open DM, post message, file upload) and may write to S3; with the default 3–6 second timeout the handler can be killed before responding, which returns a generic 500 "Internal Server Error" with no error log from your code.
- **Environment variables** (Configuration → Environment variables):
  - `SLACK_BOT_TOKEN` – Bot token.
  - `SLACK_SIGNING_SECRET` – Signing secret.
  - `JAMES_USER_ID` – Slack user ID that receives the Sales Room DM (e.g. AE James). Optionally `JAMES_2_USER_ID` for a second recipient.
  - **`BASE_URL`** – **Required for the Sales Room link in Slack.** Set this to your API Gateway base URL (no trailing slash), e.g. `https://abc123xyz.execute-api.us-east-1.amazonaws.com`. The “Review & Approve Plan” button will then open `BASE_URL/sales-room?customer=ACME`.

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
`https://<your-api-id>.execute-api.<region>.amazonaws.com/sales-room?customer=ACME`  
(and you set that base in `BASE_URL` as above).

### 7.4 Slack Event Subscriptions (for Lambda)

1. In your Slack app → **Event Subscriptions** → **Request URL**, set:  
   `https://<your-api-id>.execute-api.<region>.amazonaws.com/slack/events`
2. Save. Slack will call this URL for `url_verification` and for message events; the Lambda responds with the challenge and handles echo.

### 7.5 How to test on AWS Lambda

1. **Sales Room in the browser**  
   Open:  
   `https://<your-api-id>.execute-api.<region>.amazonaws.com/sales-room?customer=ACME`  
   You should see the customer panel and the editable tasks table. If you get 403/404/502, check that API Gateway is routing **GET** requests to your Lambda (e.g. proxy route in §7.3).

2. **Send the Sales Room DM**  
   Lambda does not run “on startup,” so the DM is not sent automatically. Trigger it once:
   - In a browser:  
     `https://<your-api-id>.execute-api.<region>.amazonaws.com/send-welcome`
   - Or with curl:  
     `curl "https://<your-api-id>.execute-api.<region>.amazonaws.com/send-welcome"`  
   The AE(s) (users in `JAMES_USER_ID` and, if set, `JAMES_2_USER_ID`) should get a DM with the message from `feature-request-messages.txt` (DM_MESSAGE) and the **“Review & Approve Plan”** button. The button should open the Sales Room URL above (only if `BASE_URL` is set correctly).

3. **Echo in Slack**  
   Invite the bot to a channel or DM it. Send a message; the bot should echo it in the same channel/DM. If echo fails, check Slack Event Subscriptions URL and Lambda logs (CloudWatch).

### 7.6 Checklist

| Item | Purpose |
|------|--------|
| `BASE_URL` set in Lambda env | Slack button opens the correct Sales Room URL |
| API Gateway forwards GET/POST to Lambda | `/sales-room`, `/send-welcome`, `/api/tasks/important-feature-request/*` work |
| `JORDAN_USER_ID` set in Lambda env | Important Feature Request flow: Jordan receives DMs; one reply from either Jordan advances the flow |
| `public/sales-room.html` (or built React app in `client/dist`) in the zip | Sales Room UI works |
| Request URL = `.../slack/events` | Slack events and echo work |

---

## Project structure

```
/project-root
  server.js           # Express app, /slack/events, /sales-room, /api/tasks/important-feature-request/*, startup Sales Room DM
  slack.js            # Slack API (postMessage, sendDM, sendDMWithBlocks, openDMChannel, uploadFileToChannel)
  salesRoomDm.js      # Reads feature-request-messages.txt (DM_MESSAGE) and builds Block Kit blocks for the DM
  featureRequestFlow.js  # Important Feature Request flow (Demi ↔ Jordan ↔ James); see docs/IMPORTANT_FEATURE_REQUEST_FLOW.md
  flowStateStore.js   # Shared flow state (memory / file / S3) for multi-instance Lambda
  config/
    slackMessages.js       # Slack message config for Jordan/James (JORDAN_FIRST_QUESTION, MESSAGE_TO_JAMES, etc.)
    featureRequestTraceSteps.js  # Trace step strings for the reasoning trail
  feature-request-messages.txt   # DM_MESSAGE, SALES_ROOM_DM_FALLBACK; task-return copy in config/slackMessages.js
  public/
    sales-room.html           # Fallback Sales Room HTML (React app in client/ is built to client/dist)
    scripted-events-config.js # Legacy pre-scripted demo; flow is now task-triggered
  env.js, botMessages.js
  docs/IMPORTANT_FEATURE_REQUEST_FLOW.md  # 8-step flow documentation
  package.json
  README.md
```

## Bot behavior

- **Startup (local):** Reads `feature-request-messages.txt` (DM_MESSAGE), builds a Slack message with Block Kit (section block + “Review & Approve Plan” button), and sends a DM to `JAMES_USER_ID` (and `JAMES_2_USER_ID` if set) with a link to the Sales Room (`/sales-room?customer=ACME`).
- **Sales Room:** `GET /sales-room` serves the Deal Execution Space UI (React app when built from `client/`) with tabs Requires Attention, Under Control, Done; task tables; **Execute** on a task; and an **Agent Reasoning Trace** panel. Task data from `client/src/config/taskDefinitions.js`.
- **Important Feature Request flow (task-triggered):** When the user clicks “Execute / Activate Demi”, the client calls `POST /api/tasks/important-feature-request/start`. Demi sends messages to both Jordans (from `config/slackMessages.js`). On each Jordan reply, the server sends the next message; after ack, trace shows Dan approval, draft email, send to James; task moves to Requires Attention; client polls `GET /api/tasks/important-feature-request/state`. See docs/IMPORTANT_FEATURE_REQUEST_FLOW.md.
- **Other tasks:** Execute on Security questionnaire, Discount exception, or RFP questionnaire runs a mock workflow (client-side; `client/src/config/reasoningTraceWorkflows.js`).
- **Messages:** For each non-bot message (no subtype), the bot echoes in the same channel—except DMs that belong to the Important Feature Request flow (Jordan's channel), which are handled by the flow and not echoed.
