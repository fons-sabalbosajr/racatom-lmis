import ActivityLog from "../models/ActivityLog.js";

// ─── Classify route into module + action ────────────────────
function classifyRequest(method, path, statusCode) {
  const p = path.toLowerCase();
  let module = "General";
  let action = method.toUpperCase();

  if (p.includes("/auth")) {
    module = "Auth";
    if (p.includes("login")) action = "LOGIN";
    else if (p.includes("register") || p.includes("create-account")) action = "REGISTER";
    else if (p.includes("change-password")) action = "CHANGE_PASSWORD";
    else if (p.includes("verify")) action = "VERIFY";
    else if (p.includes("forgot") || p.includes("reset")) action = "RESET_PASSWORD";
  } else if (p.includes("/loans") || p.includes("/loan_disbursed") || p.includes("/loan_rates") || p.includes("/loan_clients_application")) {
    module = "Loans";
    if (method === "POST") action = "CREATE";
    else if (method === "PUT" || method === "PATCH") action = "UPDATE";
    else if (method === "DELETE") action = "DELETE";
    else action = "VIEW";
  } else if (p.includes("/loan-collections")) {
    module = "Collections";
    if (p.includes("import") || p.includes("commit")) action = "IMPORT";
    else if (method === "POST") action = "CREATE";
    else if (method === "PUT" || method === "PATCH") action = "UPDATE";
    else if (method === "DELETE") action = "DELETE";
    else action = "VIEW";
  } else if (p.includes("/messages")) {
    module = "Messaging";
    if (p.includes("send")) action = "SEND";
    else if (p.includes("route-loan")) action = "ROUTE";
    else if (method === "DELETE") action = "DELETE";
    else if (method === "PUT") action = "UPDATE";
    else action = "VIEW";
  } else if (p.includes("/users")) {
    module = "Users";
    if (p.includes("approve")) action = "APPROVE";
    else if (p.includes("reject")) action = "REJECT";
    else if (method === "PUT" || method === "PATCH") action = "UPDATE";
    else if (method === "DELETE") action = "DELETE";
    else action = "VIEW";
  } else if (p.includes("/dashboard")) {
    module = "Dashboard";
    action = "VIEW";
  } else if (p.includes("/collectors")) {
    module = "Collectors";
    if (method === "POST") action = "CREATE";
    else if (method === "PUT" || method === "PATCH") action = "UPDATE";
    else if (method === "DELETE") action = "DELETE";
    else action = "VIEW";
  } else if (p.includes("/announcements")) {
    module = "Announcements";
    if (method === "POST") action = "CREATE";
    else if (method === "PUT" || method === "PATCH") action = "UPDATE";
    else if (method === "DELETE") action = "DELETE";
    else action = "VIEW";
  } else if (p.includes("/theme")) {
    module = "Settings";
    action = "UPDATE";
  } else if (p.includes("/database")) {
    module = "Database";
    action = method === "GET" ? "VIEW" : "EXECUTE";
  } else if (p.includes("/activity-logs")) {
    module = "Logs";
    action = "VIEW";
  }

  return { module, action };
}

// ─── Middleware: record activity for mutating requests ───────
export function activityLogger(req, res, next) {
  // Only log mutating requests + logins, skip simple GETs (except login)
  const isLogin = req.path.toLowerCase().includes("login") && req.method === "POST";
  const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);

  if (!isMutating && !isLogin) return next();

  // Skip health checks and static files
  if (req.path.includes("/health") || req.path.includes("/uploads")) return next();

  const startTime = Date.now();

  // Capture original end to log after response
  const originalEnd = res.end;
  res.end = function (...args) {
    res.end = originalEnd;
    res.end(...args);

    // Build log entry asynchronously (don't block response)
    setImmediate(async () => {
      try {
        const { module, action } = classifyRequest(req.method, req.originalUrl || req.path, res.statusCode);

        const logEntry = {
          method: req.method,
          path: req.originalUrl || req.path,
          statusCode: res.statusCode,
          ip: req.ip || req.headers["x-forwarded-for"] || req.connection?.remoteAddress,
          userAgent: req.headers["user-agent"],
          action,
          module,
        };

        // Attach user info if authenticated
        if (req.user) {
          logEntry.user = req.user._id;
          logEntry.username = req.user.Username;
          logEntry.fullName = req.user.FullName;
          logEntry.position = req.user.Position;
        }

        // Build description
        const parts = [`${action} on ${module}`];
        if (req.params?.id) parts.push(`(ID: ${req.params.id})`);
        if (res.statusCode >= 400) parts.push(`[Failed: ${res.statusCode}]`);
        logEntry.description = parts.join(" ");

        await ActivityLog.create(logEntry);
      } catch (err) {
        // Logging failures should never break the app
        console.error("Activity log write error:", err.message);
      }
    });
  };

  next();
}

// ─── Controller: list logs ──────────────────────────────────
export async function getLogs(req, res) {
  try {
    const {
      page = 1,
      limit = 50,
      module,
      action,
      user,
      startDate,
      endDate,
      search,
    } = req.query;

    const query = {};
    if (module) query.module = module;
    if (action) query.action = action;
    if (user) query.user = user;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
        { path: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ActivityLog.countDocuments(query),
    ]);

    return res.json({ success: true, data: logs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error("getLogs error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch logs" });
  }
}

// ─── Controller: get distinct modules and actions for filters ───
export async function getLogFilters(req, res) {
  try {
    const [modules, actions] = await Promise.all([
      ActivityLog.distinct("module"),
      ActivityLog.distinct("action"),
    ]);
    return res.json({ success: true, modules, actions });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch filters" });
  }
}

// ─── Controller: clear old logs ─────────────────────────────
export async function clearLogs(req, res) {
  try {
    const { olderThanDays = 90 } = req.body;
    const cutoff = new Date(Date.now() - Number(olderThanDays) * 24 * 60 * 60 * 1000);
    const result = await ActivityLog.deleteMany({ createdAt: { $lt: cutoff } });
    return res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to clear logs" });
  }
}
