const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode");
const config = require("./config/config");

const connections = new Map();

const qrCodes = new Map();

const createConnection = async (sessionId) => {
  const sessionPath = path.join(config.sessionPath, sessionId);

  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const logger = pino({ level: "silent" });

  const sock = makeWASocket({
    printQRInTerminal: false,
    auth: state,
    logger,
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const qrImage = await qrcode.toDataURL(qr);
        qrCodes.set(sessionId, qrImage);
        console.log(`QR Code untuk sesi ${sessionId} telah diperbarui`);
      } catch (error) {
        console.error("Gagal membuat QR code:", error);
      }
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error instanceof Boom &&
        lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;

      console.log(
        `Koneksi terputus karena ${
          lastDisconnect?.error?.message || "alasan tidak diketahui"
        }`
      );

      if (shouldReconnect) {
        console.log(`Mencoba menghubungkan kembali untuk sesi ${sessionId}...`);
        connections.set(sessionId, await createConnection(sessionId));
      } else {
        console.log(
          `Koneksi untuk sesi ${sessionId} telah keluar, menghapus sesi...`
        );
        connections.delete(sessionId);
        qrCodes.delete(sessionId);

        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        }
      }
    }

    if (connection === "open") {
      console.log(`Koneksi untuk sesi ${sessionId} telah terbuka!`);
      qrCodes.delete(sessionId);
    }
  });

  sock.ev.on("creds.update", saveCreds);

  return sock;
};

const getConnection = async (sessionId) => {
  if (!connections.has(sessionId)) {
    connections.set(sessionId, await createConnection(sessionId));
  }
  return connections.get(sessionId);
};

const sendMessage = async (sessionId, to, message) => {
  try {
    const sock = await getConnection(sessionId);

    const formattedNumber = to.includes("@s.whatsapp.net")
      ? to
      : `${to.replace(/[^0-9]/g, "")}@s.whatsapp.net`;

    const result = await sock.sendMessage(formattedNumber, { text: message });
    return { success: true, result };
  } catch (error) {
    console.error(`Gagal mengirim pesan: ${error.message}`);
    return { success: false, error: error.message };
  }
};

const getQR = (sessionId) => {
  return qrCodes.get(sessionId);
};

const getConnectionStatus = (sessionId) => {
  if (!connections.has(sessionId)) {
    return { connected: false, qr: getQR(sessionId) };
  }

  const sock = connections.get(sessionId);
  return {
    connected: sock.user != null,
    user: sock.user,
    qr: getQR(sessionId),
  };
};

const logout = async (sessionId) => {
  try {
    if (connections.has(sessionId)) {
      const sock = connections.get(sessionId);
      await sock.logout();
      connections.delete(sessionId);
      qrCodes.delete(sessionId);

      const sessionPath = path.join(config.sessionPath, sessionId);
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      }

      return { success: true };
    }
    return { success: false, error: "Sesi tidak ditemukan" };
  } catch (error) {
    console.error(`Gagal logout: ${error.message}`);
    return { success: false, error: error.message };
  }
};

module.exports = {
  getConnection,
  sendMessage,
  getQR,
  getConnectionStatus,
  logout,
};
