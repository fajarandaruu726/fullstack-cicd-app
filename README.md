# 🛠️ ServiTask Enterprise - Work Order & Service Ticketing System

ServiTask Enterprise adalah sistem manajemen tiket dan *work order* layanan teknis berbasis web modern dengan arsitektur multi-container 4-Tier (Frontend React SPA + Nginx, Backend Express API, Database PostgreSQL 15, dan Caching Engine Redis 7) yang dilengkapi fitur komunikasi *real-time* (Socket.io) serta otomatisasi CI/CD via GitHub Actions.

---

## 👥 Peran Pengguna & Modul Portal

Aplikasi ini mengusung sistem **Client-Server Dual-Portal**:

1. **👤 Portal Klien (Pelapor):**
   * Mengajukan tiket kendala teknis / fasilitas baru.
   * Mengunggah foto lampiran bukti kendala (via Multer File Upload).
   * Memantau status verifikasi tiket secara *real-time* tanpa perlu memperbarui (*refresh*) halaman.
2. **🛠️ Portal Server / Admin (Monitoring Control Room):**
   * Memantau Dashboard KPI statistik operasional *real-time*.
   * Memproses dan mengubah status tiket (`Pending` ➔ `In Progress` ➔ `Completed` / `Rejected`).
   * Menghapus tiket dengan modal verifikasi otentikasi konfirmasi.

---

## 🏗️ Arsitektur Multi-Container (4-Tier Stack)

Aplikasi ini berjalan dalam virtual network terisolasi yang terdiri dari 4 container independen:

- **Frontend Container (`app_frontend`):** React SPA yang dibuild menggunakan Vite dan didistribusikan via Web Server Nginx (Port `8080`).
- **Backend Container (`app_backend`):** RESTful API & WebSocket Server berbasis Node.js Express (Port `5000`).
- **Database Container (`app_db`):** Relational Database PostgreSQL 15 (Port `5432`).
- **Cache Container (`app_redis`):** In-Memory Data Store Redis 7 untuk akselerasi query API (Port `6379`).

---

## ⚙️ Fitur Utama & Teknologi

- **Real-Time Synchronization:** Socket.io WebSocket untuk pembaruan status dan push notifikasi tiket secara langsung di layar pengguna.
- **High-Performance Caching:** Redis Caching Layer pada endpoint `GET /api/orders` untuk merespon request data lebih cepat dan mengurangi beban query PostgreSQL.
- **Media Uploading:** Multer storage engine untuk mengunggah dan menyajikan foto bukti kerusakan/kendala.
- **Authentication & Security:** JWT (JSON Web Token) role-based authentication.
- **Automated CI/CD Pipeline:** GitHub Actions yang otomatis mem-build & mem-push container image ke Docker Hub repository (`fajar262626/app-backend` & `fajar262626/app-frontend`).

---

## 🚀 Cara Menjalankan di Lokal

### Prasyarat
* Docker Desktop sudah terinstal dan aktif.

### Langkah Eksekusi
1. Buka terminal di direktori utama proyek (`fullstack-cicd-app`).
2. Bersihkan container/volume lama dan jalankan seluruh stack dari nol:
   ```bash
   docker compose down -v
   docker compose up -d --build
   ```

## Tim Pengembang

- Fajar Arya Priangga (211112346) - Ketua / Lead DevOps & Full-Stack Developer
- Richi Putra Lin (231110321) - Backend Developer & Database-Cache Engineer
