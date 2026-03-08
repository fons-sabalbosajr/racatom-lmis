// middleware/validateFinancial.js
// Server-side financial validation utilities and middleware

/**
 * Escape special regex characters in a string to prevent ReDoS attacks.
 * @param {string} str - Raw user input
 * @returns {string}   - Escaped string safe for use in new RegExp()
 */
export function escapeRegex(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validate that a value is a safe finite number (not NaN, Infinity, or negative when disallowed).
 * @param {*}       value   - The value to check
 * @param {Object}  opts    - Options
 * @param {boolean} opts.allowNegative  - Allow negative numbers (default: false)
 * @param {number}  opts.max            - Maximum value (default: 999_999_999)
 * @returns {string|null} Error message or null if valid
 */
export function validateAmount(value, { allowNegative = false, max = 999_999_999 } = {}) {
  if (value === undefined || value === null || value === "") return null; // optional field
  const num = Number(value);
  if (!Number.isFinite(num)) return "Amount must be a valid finite number";
  if (!allowNegative && num < 0) return "Amount cannot be negative";
  if (num > max) return `Amount cannot exceed ${max.toLocaleString()}`;
  return null;
}

/**
 * List of known financial fields across all models.
 * Used to automatically validate any financial field present in req.body.
 */
const FINANCIAL_FIELDS = new Set([
  "LoanAmount",
  "PrincipalAmount",
  "LoanBalance",
  "LoanInterest",
  "LoanAmortization",
  "Penalty",
  "MonthlyIncome",
  "Amortization",
  "AmortizationPrincipal",
  "AmortizationInterest",
  "PrincipalDue",
  "PrincipalPaid",
  "PrincipalBalance",
  "CollectedInterest",
  "InterestPaid",
  "TotalCollected",
  "ActualCollection",
  "CollectionPayment",
  "RunningBalance",
  "TotalLoanToPay",
  "Processing Fee",
  "Interest Rate/Month",
  "Penalty Rate",
  "Notarial Rate",
  "Annotation Rate",
  "Insurance Rate",
  "Vat Rate",
  "Doc Rate",
  "Misc. Rate",
  "Loan to be Disbursed",
  "Total Loan to be Paid",
]);

/**
 * Express middleware: automatically validates all known financial fields in req.body.
 * Returns 400 if any field is invalid.
 */
export function validateFinancialFields(req, res, next) {
  if (!req.body || typeof req.body !== "object") return next();

  for (const field of FINANCIAL_FIELDS) {
    if (field in req.body) {
      const err = validateAmount(req.body[field], {
        // Allow negative for balance fields (can be over-paid)
        allowNegative: field.toLowerCase().includes("balance"),
      });
      if (err) {
        return res.status(400).json({
          success: false,
          message: `Invalid value for "${field}": ${err}`,
        });
      }
    }
  }
  next();
}

/**
 * Sanitize MongoDB filter objects to prevent operator injection.
 * Strips any top-level keys starting with "$" (like $where, $expr, etc.)
 * Only allows simple equality, known safe operators ($in, $gt, $lt, $gte, $lte, $ne, $regex).
 * @param {Object} filter - Raw filter from request body
 * @returns {Object}      - Sanitized filter
 */
export function sanitizeMongoFilter(filter) {
  if (!filter || typeof filter !== "object") return {};
  const safe = {};
  const ALLOWED_OPS = new Set(["$in", "$nin", "$gt", "$lt", "$gte", "$lte", "$ne", "$regex", "$options", "$eq"]);

  for (const [key, value] of Object.entries(filter)) {
    // Block dangerous top-level operators
    if (key.startsWith("$")) continue;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      // Nested operators — whitelist
      const sanitizedOp = {};
      for (const [op, opVal] of Object.entries(value)) {
        if (ALLOWED_OPS.has(op)) {
          sanitizedOp[op] = opVal;
        }
      }
      if (Object.keys(sanitizedOp).length > 0) {
        safe[key] = sanitizedOp;
      }
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

/**
 * Whitelist fields for bulk update operations.
 * Only specified fields are allowed through; everything else is stripped.
 * @param {Object} updates    - Raw updates object from request body
 * @param {Set|Array} allowed - Set or array of allowed field names
 * @returns {Object}          - Filtered updates
 */
export function whitelistFields(updates, allowed) {
  if (!updates || typeof updates !== "object") return {};
  const allowedSet = allowed instanceof Set ? allowed : new Set(allowed);
  const safe = {};
  for (const [key, value] of Object.entries(updates)) {
    if (allowedSet.has(key)) {
      safe[key] = value;
    }
  }
  return safe;
}
