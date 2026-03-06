# Important Feature Request Flow (Demi, Jordan, James)

This document describes the supported message flow between **Demi** (the AI agent), **Jordan** (Product), and **James** (the AE) for the "Important Feature Request" task.

## Participants

- **Demi**: AI agent that sends Slack messages and drives the flow.
- **Jordan (Product)**: Up to two Slack user IDs (`JORDAN_USER_ID`, `JORDAN_2_USER_ID`). Each receives every message from Demi; **one reply from either Jordan** is enough to advance the flow.
- **James (AE)**: Up to two Slack user IDs (`JAMES_USER_ID`, `JAMES_2_USER_ID`). Each receives the final summary message from Demi.
- **Dan (Security)**: Simulated; no real Slack message. Trace shows "Sent to Dan" and "Received approval from Dan" after a short delay.

## Flow (8 steps)

1. **Demi sends first message to Jordan**  
   Content: `JORDAN_FIRST_QUESTION` (customer, urgency, item, what Demi has done, suggested response to AE). Sent to both Jordan user IDs. Optional: attach SCIM PDF.

2. **Jordan replies**  
   Any reply from either Jordan in that DM is accepted. Content is not validated.

3. **Demi sends second message to Jordan**  
   Content: `JORDAN_SECOND_QUESTION` (follow-up detail, sources, recommendation). Sent to both Jordans.

4. **Jordan replies again**  
   Any second reply from either Jordan is accepted.

5. **Demi sends ack to Jordan**  
   Content: `JORDAN_ACK_FINAL` (thanks, will get Dan’s approval). Sent to both Jordans.

6. **Reasoning trace: Dan (Security)**  
   In the reasoning trace the client sees: Demi sends to Dan (Security) for approval; after a short delay, “Received approval from Dan.”

7. **Task moves to Requires Attention**  
   The task moves from “Under Control” to “Requires Attention.” Task content is updated (e.g. neededFromYou, and any other returned fields) so the table reflects that all approvals are in and the AE only needs to send the email.

8. **Demi sends message to James (AE)**  
   Content: `MESSAGE_TO_JAMES` (product-approved response ready, customer-ready answer, suggested next step). Sent to both James user IDs.

## State and polling

- Flow state (phase, jordans, events, moveTo) is persisted in a shared store (S3 or file) so that any server instance (e.g. Lambda) can continue the flow and serve the polling endpoint.
- The client polls `GET /api/tasks/important-feature-request/state` to receive new trace events, `moveTo`, and optional `taskUpdate` until the task returns to Requires Attention.
