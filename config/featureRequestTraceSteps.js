/**
 * Trace step messages for the Important Feature Request flow (server-side).
 * Used by featureRequestFlow when calling addEvent() so strings are editable in one place.
 */

export const TRACE_STEPS = {
  DRAFT_RESPONSE: 'Draft response based on Identity Integrations Roadmap (Feb 12) and SCIM provisioning doc',
  SENT_TO_JORDAN: 'Sent proposed response to Jordan for approval',
  RECEIVED_JORDAN_APPROVAL: 'Received Jordan approval',
  WAITING_DAN: 'Waiting for @Dan_Ferries approval',
  SENT_TO_DAN: 'Sent to @Dan_Ferries for approval',
  RECEIVED_DAN_APPROVAL: 'Received approval from @Dan_Ferries',
  DRAFTED_EMAIL: 'Drafted email to customer from approval notes',
  SENDING_TO_JAMES: 'Sending to James for approval',
};
