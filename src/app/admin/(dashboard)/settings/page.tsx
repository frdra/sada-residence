"use client";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h3 className="font-semibold mb-4">Informasi Properti</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Bisnis
            </label>
            <input
              type="text"
              className="input-field"
              defaultValue="Sada Residence"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Admin
            </label>
            <input
              type="email"
              className="input-field"
              defaultValue="admin@sadaresidence.com"
              disabled
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6 mb-6">
        <h3 className="font-semibold mb-4">Integrasi</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-sm">Xendit Payment Gateway</p>
              <p className="text-xs text-gray-500">QRIS, Kartu Kredit, Bank Transfer</p>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">
              Terhubung
            </span>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-sm">Resend Email</p>
              <p className="text-xs text-gray-500">Konfirmasi booking otomatis</p>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">
              Terhubung
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-4">Database</h3>
        <p className="text-sm text-gray-500 mb-4">
          Kelola database Supabase untuk properti, tipe kamar, dan tarif.
        </p>
        <div className="space-y-2 text-sm">
          <p className="text-gray-600">
            Untuk mengubah data properti, tipe kamar, dan tarif, gunakan Supabase Dashboard
            atau jalankan migration SQL secara langsung.
          </p>
        </div>
      </div>
    </div>
  );
}
