"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch, setToken } from "@/lib/api";

type LoginPayload = {
  token: string;
  user: {
    name: string;
    email: string;
  };
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await apiFetch<LoginPayload>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setToken(response.data.token);
      toast.success(`Selamat datang, ${response.data.user.name}`);
      router.push("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/50 bg-white shadow-[0_34px_90px_rgba(10,31,92,0.18)] lg:grid-cols-[0.92fr_1fr]">
        <div className="madani-blue p-8 text-white lg:p-10">
          <Image
            src="/images/logo-madani-montessori.png"
            alt="Logo Madani"
            width={74}
            height={74}
            className="rounded-full border border-[#f5c542]/60 bg-white p-1"
          />
          <p className="mt-8 text-sm font-extrabold uppercase text-[#ffe08a]">
            Dashboard Akademik
          </p>
          <h1 className="font-display mt-3 text-5xl font-extrabold leading-[0.95]">
            Madani Nidham
          </h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-white/76">
            Sistem kerja admin dan guru untuk murid, kelas, absensi, jurnal,
            penilaian Montessori, raport, pengumuman, agenda, dan PPDB.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 text-sm font-bold">
            <span className="rounded-2xl bg-white/10 p-3">Admin</span>
            <span className="rounded-2xl bg-white/10 p-3">Guru</span>
            <span className="rounded-2xl bg-white/10 p-3">Raport PDF</span>
            <span className="rounded-2xl bg-white/10 p-3">PPDB Online</span>
          </div>
        </div>

        <form onSubmit={submit} className="p-8 lg:p-10">
          <p className="text-sm font-extrabold uppercase text-[#123c8c]">
            Login
          </p>
          <h2 className="font-display mt-2 text-4xl font-extrabold text-[#0a1f5c]">
            Masuk ke dashboard
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#64748b]">
            Gunakan akun yang dibuat admin sekolah.
          </p>

          <label className="mt-8 block text-sm font-extrabold text-[#0a1f5c]">
            Email
            <input
              className="madani-input mt-2"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="mt-5 block text-sm font-extrabold text-[#0a1f5c]">
            Password
            <input
              className="madani-input mt-2"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading || !hydrated}
            className="madani-button mt-8 w-full bg-gradient-to-r from-[#f5c542] to-[#ffe08a] text-[#0a1f5c]"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </section>
    </main>
  );
}
