/**
 * Label slugs and display names for task labels. CSS in App.css uses .label-pill--<slug>.
 * Slugs: legal, security, product, commercial, stakeholders (and default for unknown).
 */

export const LABEL_SLUGS = ['legal', 'security', 'product', 'commercial', 'stakeholders', 'onboarding', 'deal-desk'];

/** Suggested labels for the "Add label" datalist (display names). */
export const SUGGESTED_LABELS = ['Legal', 'Security', 'Product', 'Commercial', 'Stakeholders', 'Onboarding', 'Deal Desk'];

/** Slug for CSS class: "Product" → "product", "Some Label" → "some-label" */
export function labelSlug(label) {
  return (label || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'default';
}
