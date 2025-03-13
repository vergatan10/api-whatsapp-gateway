const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const config = require("./config/config");

const API_KEYS_FILE = path.join(__dirname, "apikeys.json");

const loadApiKeys = () => {
  try {
    if (fs.existsSync(API_KEYS_FILE)) {
      const data = fs.readFileSync(API_KEYS_FILE, "utf8");
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error("Gagal memuat API keys:", error);
    return {};
  }
};

const saveApiKeys = (apiKeys) => {
  try {
    fs.writeFileSync(API_KEYS_FILE, JSON.stringify(apiKeys, null, 2));
    return true;
  } catch (error) {
    console.error("Gagal menyimpan API keys:", error);
    return false;
  }
};

let apiKeys = loadApiKeys();

const generateApiKey = (sessionId, description = "") => {
  const apiKey = crypto.randomBytes(16).toString("hex");

  apiKeys[apiKey] = {
    sessionId,
    description,
    createdAt: new Date().toISOString(),
  };

  saveApiKeys(apiKeys);
  return apiKey;
};

const getSessionFromApiKey = (apiKey) => {
  if (apiKey === config.apiKey) {
    return "default";
  }

  if (apiKeys[apiKey]) {
    return apiKeys[apiKey].sessionId;
  }

  return null;
};

const apiKeyMiddleware = (req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.query.apiKey;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: "API key diperlukan",
    });
  }

  if (apiKey === config.apiKey || apiKeys[apiKey]) {
    req.sessionId = getSessionFromApiKey(apiKey);
    return next();
  }

  return res.status(403).json({
    success: false,
    error: "API key tidak valid",
  });
};

const deleteApiKey = (apiKey) => {
  if (apiKeys[apiKey]) {
    delete apiKeys[apiKey];
    saveApiKeys(apiKeys);
    return true;
  }
  return false;
};

const getAllApiKeys = () => {
  return apiKeys;
};

module.exports = {
  apiKeyMiddleware,
  generateApiKey,
  getSessionFromApiKey,
  deleteApiKey,
  getAllApiKeys,
};
