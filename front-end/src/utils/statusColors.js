// Shared status color utilities

// Corporate color mapping for Loan Status
export const LOAN_STATUS_COLORS = {
  UPDATED: 'green',
  ARREARS: 'orange',
  'PAST DUE': 'red',
  LITIGATION: 'volcano',
  DORMANT: 'gray',
  CLOSED: 'default',
};

// Normalize and resolve a color for a given loan status string
export function getLoanStatusColor(status) {
  if (!status || typeof status !== 'string') return 'default';
  const key = status.toUpperCase();
  return LOAN_STATUS_COLORS[key] || 'default';
}

// Process Status colors used in Loans list
export const LOAN_PROCESS_STATUS_COLORS = {
  Updated: 'green',
  Approved: 'blue',
  Pending: 'gold',
  Released: 'purple',
  'Loan Released': 'purple',
};

export function getProcessStatusColor(status) {
  if (!status || typeof status !== 'string') return 'default';
  return LOAN_PROCESS_STATUS_COLORS[status] || 'default';
}

// Collections Status colors used in Loans list
export const COLLECTION_STATUS_COLORS = {
  Updated: 'green',
  'Collection updated': 'green',
  Outdated: 'magenta',
  'No Data Encoded': 'gray',
};

export function getCollectionStatusColor(status) {
  if (!status || typeof status !== 'string') return 'default';
  return COLLECTION_STATUS_COLORS[status] || 'default';
}
