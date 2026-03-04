/**
 * Pre-scripted Jessica demo events.
 * Replace or extend this list for different flows. For future real Slack integration,
 * swap this for an API that returns events (or push from server via WebSocket).
 *
 * action: "send_message" | "receive_mock_reply" | "edit_task"
 * task: task name (must match a row in the Sales Room task table)
 * to / from: employee handle (e.g. @CISO, @ProductMgr)
 * status: "approved" | "edited" | "pending"
 * delay: ms from script start when this event runs
 * notes: optional, for edit_task
 */
(function (global) {
  'use strict';

  var SCRIPTED_EVENTS = [
    { action: 'send_message', to: '@CISO', task: 'Security Questionnaire', delay: 2000 },
    { action: 'send_message', to: '@ProductMgr', task: 'RFP Response', delay: 3500 },
    { action: 'receive_mock_reply', from: '@CISO', task: 'Security Questionnaire', status: 'approved', delay: 5000 },
    { action: 'edit_task', task: 'RFP Response', notes: 'Updated answer per internal review', delay: 6500 },
    { action: 'send_message', to: '@Legal', task: 'Pricing Approval', delay: 8000 },
    { action: 'receive_mock_reply', from: '@LegalHelper', task: 'Pricing Approval', status: 'approved', delay: 11000 },
    { action: 'edit_task', task: 'Send proposal and pricing deck', notes: 'Attached final pricing', delay: 13000 },
    { action: 'receive_mock_reply', from: '@ProductMgr', task: 'RFP Response', status: 'approved', delay: 15000 }
  ];

  /**
   * Returns the list of scripted events. Replace with API call later for real flow.
   * @returns {Array<{action: string, task?: string, to?: string, from?: string, status?: string, delay: number, notes?: string}>}
   */
  function getScriptedEvents() {
    return SCRIPTED_EVENTS;
  }

  global.SCRIPTED_EVENTS = SCRIPTED_EVENTS;
  global.getScriptedEvents = getScriptedEvents;
})(typeof window !== 'undefined' ? window : globalThis);
