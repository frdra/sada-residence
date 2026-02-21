# Sada Residence — Booking Web App

Aplikasi booking kamar untuk Sada Residence, apartemen premium di Jimbaran, Bali. Mendukung booking harian, mingguan, dan bulanan dengan pembayaran online via Xendit.

## Tech Stack

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Payment**: Xendit (QRIS, Kartu Kredit, Bank Transfer)
- **Email**: Resend
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Fitur

### Public Website
- Landing page dengan info properti dan tipe kamar
- Cek ketersediaan kamar berdasarkan tanggal
- Booking flow 3 langkah (pilih tanggal → pilih kamar → isi data tamu)
- Pembayaran otomatis via Xendit
- Email konfirmasi otomatis

### Admin Dashboard
- Overview dashboard dengan statistik revenue dan occupancy
- Manajemen kamar dengan visual grid status
- Manajemen booking dengan filter dan pencarian
- Halaman keuangan dengan breakdown metode pembayaran
- Kalender booking
- Export data ke CSV
- Pengaturan dan integrasi

## Properti

| Properti | Jumlah Kamar |
|---|---|
| Sada Residence Persada | 30 |
| Sada Residence Udayana | 33 |
| Sada Residence Taman Griya | 33 |

## Tipe Kamar

| Tipe | Ukuran | Harian | Mingguan | Bulanan |
|---|---|---|---|---|
| Standard | 20m² | Rp 350.000 | Rp 2.000.000 | Rp 5.500.000 |
| Deluxe | 28m² | Rp 500.000 | Rp 3.000.000 | Rp 8.000.000 |
| Suite | 40m² | Rp 850.000 | Rp 5.000.000 | Rp 13.000.000 |

## Setup

### 1. Clone & Install

```bash
git clone <repo-url>
cd sada-residence-app
npm install
```

### 2. Environment Variables

Copy `.env.example` ke `.env.local` dan isi semua variabel:

```bash
cp .env.example .env.local
```

Variabel yang diperlukan:

| Variable | Deskripsi |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL proyek Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key Supabase |
| `NEXT_PUBLIC_APP_URL` | URL aplikasi (localhost:3000 untuk dev) |
| `XENDIT_SECRET_KEY` | Secret key Xendit |
| `XENDIT_WEBHOOK_TOKEN` | Token verifikasi webhook Xendit |
| `XENDIT_PUBLIC_KEY` | Public key Xendit |
| `RESEND_API_KEY` | API key Resend |
| `EMAIL_FROM` | Alamat email pengirim |
| `ADMIN_EMAIL` | Email admin default |

### 3. Database Setup

Jalankan migration SQL di Supabase Dashboard atau via CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Login dan link ke proyek
supabase login
supabase link --project-ref <project-id>

# Jalankan migration
supabase db push
```

Atau jalankan file SQL secara manual:
1. `supabase/migrations/001_schema.sql` — Schema, indexes, RLS policies, functions
2. `supabase/migrations/002_seed.sql` — Seed data (properti, tipe kamar, tarif, kamar)

### 4. Supabase Auth

Buat user admin di Supabase Dashboard:
1. Buka **Authentication** → **Users**
2. Klik **Add User** dan masukkan email + password
3. Tambahkan record di tabel `admin_profiles` dengan `auth_user_id` yang sesuai

### 5. Xendit Webhook

Setup webhook di Xendit Dashboard:
1. Buka **Settings** → **Webhooks**
2. Tambahkan URL: `https://your-domain.com/api/webhooks/xendit`
3. Set Verification Token (sama dengan `XENDIT_WEBHOOK_TOKEN` di env)

### 6. Run Development

```bash
npm run dev
```

Buka http://localhost:3000

## Testing

```bash
npm test
```

## Deployment (Vercel)

1. Push ke GitHub
2. Import di Vercel
3. Set semua environment variables
4. Deploy

```bash
vercel --prod
```

## Project Structure

```
sada-residence-app/
├── src/
│   ├── app/
│   │   ├── (public)/          # Public pages (home, rooms, booking)
│   │   ├── admin/             # Admin dashboard
│   │   │   ├── login/
│   │   │   └── (dashboard)/   # Protected admin pages
│   │   └── api/               # API routes
│   │       ├── availability/
│   │       ├── bookings/
│   │       ├── webhooks/xendit/
│   │       └── admin/
│   ├── components/
│   │   └── ui/
│   ├── lib/
│   │   ├── db/                # Database queries & business logic
│   │   ├── supabase/          # Supabase client setup
│   │   ├── payments/          # Xendit integration
│   │   ├── email/             # Email templates
│   │   └── validators/        # Zod schemas
│   └── types/
├── supabase/
│   └── migrations/
├── __tests__/
└── public/
```

## Keamanan

- Row Level Security (RLS) aktif di semua tabel
- Admin routes dilindungi middleware authentication
- Xendit webhook diverifikasi dengan callback token
- Double booking dicegah dengan PostgreSQL row-level locking (`FOR UPDATE`)
- Input divalidasi dengan Zod schemas
- Service role key hanya digunakan di server-side
