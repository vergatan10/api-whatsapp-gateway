module.exports = {
  port: process.env.PORT || 3000,
  apiKey: process.env.API_KEY || "default_key_v_e_r_g_a", // Default API key
  sessionPath: "./sessions", // untuk menyimpan sesi
  reconnectInterval: 5000, // untuk mencoba koneksi ulang (dalam ms)
  maxRetries: 5, // maksimum percobaan koneksi ulang
  webhookUrl: process.env.WEBHOOK_URL || "", // URL webhook untuk menerima notifikasi
};
