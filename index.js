const express = require("express");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const whatsapp = require("./whatsapp");
const auth = require("./auth");
const config = require("./config/config");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.get("/", (req, res) => {
  res.json({
    status: "online",
  });
});

app.post("/api/session/create", (req, res) => {
  try {
    const sessionId = req.body.sessionId || uuidv4();
    const description = req.body.description || "";

    const apiKey = auth.generateApiKey(sessionId, description);

    whatsapp.getConnection(sessionId);

    res.json({
      success: true,
      sessionId,
      apiKey,
      message:
        "Sesi berhasil dibuat. Gunakan API key untuk operasi selanjutnya.",
    });
  } catch (error) {
    console.error("Gagal membuat sesi:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/api/session/qr", auth.apiKeyMiddleware, async (req, res) => {
  try {
    const sessionId = req.sessionId;
    const status = whatsapp.getConnectionStatus(sessionId);

    if (status.connected) {
      return res.json({
        success: true,
        connected: true,
        user: status.user,
        message: "Sudah terautentikasi",
      });
    }

    if (!status.qr) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const updatedStatus = whatsapp.getConnectionStatus(sessionId);

      if (!updatedStatus.qr) {
        return res.status(404).json({
          success: false,
          error: "QR code belum tersedia. Coba lagi nanti.",
        });
      }

      return res.json({
        success: true,
        connected: false,
        qr: updatedStatus.qr,
      });
    }

    res.json({
      success: true,
      connected: false,
      qr: status.qr,
    });
  } catch (error) {
    console.error("Gagal mendapatkan QR code:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/api/session/status", auth.apiKeyMiddleware, (req, res) => {
  try {
    const sessionId = req.sessionId;
    const status = whatsapp.getConnectionStatus(sessionId);

    res.json({
      success: true,
      connected: status.connected,
      user: status.user,
    });
  } catch (error) {
    console.error("Gagal memeriksa status:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/api/session/logout", auth.apiKeyMiddleware, async (req, res) => {
  try {
    const sessionId = req.sessionId;
    const result = await whatsapp.logout(sessionId);

    if (result.success) {
      const apiKey = req.headers["x-api-key"] || req.query.apiKey;
      if (apiKey !== config.apiKey) {
        auth.deleteApiKey(apiKey);
      }

      res.json({
        success: true,
        message: "Berhasil logout dari sesi",
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Gagal logout:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/api/send", auth.apiKeyMiddleware, async (req, res) => {
  try {
    const { to, message } = req.body;
    const sessionId = req.sessionId;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Parameter "to" dan "message" diperlukan',
      });
    }

    const status = whatsapp.getConnectionStatus(sessionId);
    if (!status.connected) {
      return res.status(400).json({
        success: false,
        error: "Sesi belum terautentikasi. Scan QR code terlebih dahulu.",
      });
    }

    const result = await whatsapp.sendMessage(sessionId, to, message);
    res.json(result);
  } catch (error) {
    console.error("Gagal mengirim pesan:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/api/keys", (req, res) => {
  const apiKey = req.headers["x-api-key"] || req.query.apiKey;

  if (apiKey !== config.apiKey) {
    return res.status(403).json({
      success: false,
      error:
        "Tidak diizinkan. Hanya admin yang dapat mengakses daftar API key.",
    });
  }

  const keys = auth.getAllApiKeys();
  res.json({
    success: true,
    keys,
  });
});

if (!fs.existsSync(config.sessionPath)) {
  fs.mkdirSync(config.sessionPath, { recursive: true });
}

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
  console.log(`API Key default: ${config.apiKey}`);
});
