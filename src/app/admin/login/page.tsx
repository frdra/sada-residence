"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      router.push("/admin/overview");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-light tracking-widest text-concrete-100 mb-1">
            SADA
          </h1>
          <p className="font-body text-sm text-terracotta-500 mb-4">
            RESIDENCE
          </p>
          <p className="font-display text-sm italic text-concrete-200">
            Selalu Ada. Always Here.
          </p>
        </div>

        <form onSubmit={handleLogin} className="bg-concrete-100 rounded-xl p-8 shadow-xl">
          <h2 className="font-display text-xl font-semibold text-charcoal-800 mb-6">
            Masuk ke Dashboard
          </h2>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block font-body text-sm font-medium text-charcoal-800 mb-1">
                Email
              </label>
              <input
                type="email"
                className="w-full px-4 py-2 font-body border border-concrete-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-400 focus:border-transparent text-charcoal-800"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sadaresidence.com"
                required
              />
            </div>
            <div>
              <label className="block font-body text-sm font-medium text-charcoal-800 mb-1">
                Password
              </label>
              <input
                type="password"
                className="w-full px-4 py-2 font-body border border-concrete-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-400 focus:border-transparent text-charcoal-800"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 px-4 py-2 font-body font-semibold text-white bg-terracotta-500 hover:bg-terracotta-700 disabled:bg-concrete-200 disabled:text-charcoal-800 rounded-lg transition-colors duration-200"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
