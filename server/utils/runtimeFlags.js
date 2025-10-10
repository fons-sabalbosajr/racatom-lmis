// utils/runtimeFlags.js
// Simple in-memory runtime flags for toggles like maintenance mode.
// Note: resets on server restart. Persist in DB or env for durability if needed.

export default {
  maintenance: false,
};
