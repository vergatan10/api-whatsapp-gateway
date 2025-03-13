# 🔥 API Whatsapp 🔥

___

API Whatsapp Gateway sederhana untuk mengirim pesan dan menyimpan sesi, ditujukan untuk programmer yang ingin membuat API menggunakan `NodeJS` dengan `ExpressJS`, menggunakan library `@whiskeysockets/baileys` untuk dapat terkoneksi ke Whatsapp dan mengirim pesan melalui API yang disediakan.

## 1.Instalasi dan Menjalankan Server

```json
npm install
npm start
```

## 2.Membuat Sesi Baru

- Endpoint `POST /api/session/create`
- Body (opsional):

```json
{
  "sessionId": "sesi_custom",
  "description": "Deskripsi sesi"
}
```

- Response:

```json
{
  "success": true,
  "sessionId": "sesi_custom",
  "apiKey": "api_key_yang_dibuat",
  "message": "Sesi berhasil dibuat. Gunakan API key untuk operasi selanjutnya."
}
```

## 3. Mendapatkan QR Code

- Endpoint `GET /api/session/qr`
- Header `x-api-key: API_KEY_ANDA`
- Response jika belum terkoneksi:

```json
{
  "success": true,
  "connected": false,
  "qr": "data:image/png;base64,..." // QR code dalam format base64
}
```

- Jika sudah terkoneksi

```json
{
  "success": true,
  "connected": true,
  "user": {
    "id": "62812345678@s.whatsapp.net",
    "name": "Nama Pengguna"
  },
  "message": "Sudah terautentikasi"
}
```

## 4. Memeriksa Status Sesi

- Endpoint: `GET /api/session/status`
- Header: `x-api-key: API_KEY_ANDA`
- Response:

```json
{
  "success": true,
  "connected": true,
  "user": {
    "id": "62812345678@s.whatsapp.net",
    "name": "Nama Pengguna"
  }
}
```

## 5. Mengirim Pesan

- Endpoint: `GET /api/send`
- Header: `x-api-key: API_KEY_ANDA`
- Body

```json
{
  "to": "6281234567890", // Nomor tujuan (tanpa @s.whatsapp.net)
  "message": "Halo, ini pesan dari API!"
}
```

- Response:

```json
{
  "success": true,
  "result": {
    "key": {
      "remoteJid": "6281234567890@s.whatsapp.net",
      "id": "message_id",
      "fromMe": true
    },
    "message": {
      "extendedTextMessage": {
        "text": "Halo, ini pesan dari API!"
      }
    }
  }
}
```

## 6. Logout dari Sesi

- Endpoint: `POST /api/session/logout`
- Header: `x-api-key: API_KEY_ANDA`
- Response:

```json
{
  "success": true,
  "message": "Berhasil logout dari sesi"
}
```

### Ringkasan

|Method|Endpoint|Keterangan|
|------|--------|----------|
|POST|`/api/session/create`|Membuat Sesi Baru|
|GET|`/api/session/qr`|Mendapatkan QR Code dalam Format Base64|
|GET|`/api/session/status`|Memeriksa Status Sesi|
|POST|`/api/send`|Mengirim Pesan|
|POST|`/api/session/logout`|Logout Sesi / Hapus Sesi|
