/**
 * Custom MongoDB sanitization middleware for Express 5 compatibility.
 * express-mongo-sanitize v2 reassigns req.query which is a getter in Express 5.
 * This middleware mutates the object in place to avoid the getter crash.
 */

const hasForbiddenChars = (str) => {
  if (typeof str !== "string") return false;
  return str.startsWith("$") || str.includes(".");
};

const sanitizeObj = (obj) => {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      if (typeof item === "string" && hasForbiddenChars(item)) {
        obj[index] = item.replace(/\$|\./g, "_");
      } else if (typeof item === "object") {
        sanitizeObj(item);
      }
    });
  } else {
    for (const key of Object.keys(obj)) {
      if (hasForbiddenChars(key)) {
        const cleanKey = key.replace(/\$|\./g, "_");
        obj[cleanKey] = obj[key];
        delete obj[key];
        if (typeof obj[cleanKey] === "object") {
          sanitizeObj(obj[cleanKey]);
        }
      } else if (typeof obj[key] === "object") {
        sanitizeObj(obj[key]);
      } else if (typeof obj[key] === "string" && hasForbiddenChars(obj[key])) {
        // Option to sanitize values too, but usually it's keys that cause NoSQL injection
        // We'll leave values alone unless we want strict sanitization.
      }
    }
  }
};

export const sanitize = (req, res, next) => {
  try {
    if (req.body) sanitizeObj(req.body);
    if (req.query) sanitizeObj(req.query);
    if (req.params) sanitizeObj(req.params);
    next();
  } catch (error) {
    next(error);
  }
};
