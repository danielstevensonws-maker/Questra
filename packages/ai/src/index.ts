/**
 * @questra/ai — the AI tiers. M2.4 ships the table-time Ruling tier (Brief 09c):
 * a streaming RulingSuggestion with the difficulty-ladder fallback (AI always has
 * a non-AI fallback). Every output conforms to a contracts schema and renders in
 * the accept/tweak/reject card. The Engine never imports this (ADR-0005).
 */
export * from './ruling.js';
export * from './stub-model.js';
