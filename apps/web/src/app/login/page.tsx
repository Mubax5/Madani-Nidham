"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { apiFetch, setToken } from "@/lib/api";

type LoginPayload = {
  token: string;
  user: {
    name: string;
    email: string;
  };
};

function modeFromGoogleState(state: string | null) {
  if (!state) return "login";
  try {
    const payload = state.split(".")[0];
    const decoded = JSON.parse(window.atob(payload)) as { mode?: string };
    return decoded.mode === "link" ? "link" : "login";
  } catch {
    return "login";
  }
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const callbackHandled = useRef(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (callbackHandled.current) return;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (!code || !state) return;

    callbackHandled.current = true;
    setGoogleLoading(true);
    const mode = modeFromGoogleState(state);
    apiFetch<LoginPayload | { name: string; email: string }>(
      mode === "link" ? "/auth/google/link" : "/auth/google/login",
      {
        method: "POST",
        body: {
          code,
          state,
          redirectUri: `${window.location.origin}/login`,
        },
      },
    )
      .then((response) => {
        if ("token" in response.data) {
          setToken(response.data.token);
        }
        toast.success(
          mode === "link"
            ? "Google berhasil diverifikasi"
            : "Login Google berhasil",
        );
        router.replace("/dashboard");
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Google gagal");
        router.replace("/login");
      })
      .finally(() => setGoogleLoading(false));
  }, [router, searchParams]);

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

  async function startGoogleLogin() {
    setGoogleLoading(true);
    try {
      const response = await apiFetch<{ url: string }>(
        `/auth/google/url?mode=login&redirectUri=${encodeURIComponent(`${window.location.origin}/login`)}`,
      );
      window.location.href = response.data.url;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Google OAuth belum siap",
      );
      setGoogleLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f7fb] px-4 py-8">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_22px_70px_rgba(10,31,92,0.14)] lg:grid-cols-[0.92fr_1fr]">
        <div className="madani-blue p-6 text-white lg:p-8">
          <Image
            src="/images/logo-madani-montessori.png"
            alt="Logo Madani"
            width={58}
            height={58}
            className="rounded-2xl border border-[#f5c542]/60 bg-white p-1"
          />
          <p className="mt-8 text-xs font-extrabold uppercase text-[#ffe08a]">
            Dashboard Akademik
          </p>
          <h1 className="font-display mt-2 text-4xl font-extrabold leading-none">
            Madani Nidham
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/76">
            Sistem kerja admin dan guru untuk murid, kelas, absensi, jurnal,
            penilaian Montessori, raport, pengumuman, agenda, dan PPDB.
          </p>
          <div className="mt-7 grid grid-cols-2 gap-2 text-xs font-bold">
            <span className="rounded-xl bg-white/10 px-3 py-2">Admin</span>
            <span className="rounded-xl bg-white/10 px-3 py-2">Guru</span>
            <span className="rounded-xl bg-white/10 px-3 py-2">Raport</span>
            <span className="rounded-xl bg-white/10 px-3 py-2">PPDB</span>
          </div>
        </div>

        <form onSubmit={submit} className="p-6 lg:p-8">
          <p className="text-xs font-extrabold uppercase text-[#123c8c]">
            Login
          </p>
          <h2 className="font-display mt-2 text-3xl font-extrabold text-[#0a1f5c]">
            Masuk ke dashboard
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#64748b]">
            Gunakan akun yang dibuat admin sekolah.
          </p>

          <label className="mt-6 block text-sm font-extrabold text-[#0a1f5c]">
            Email
            <input
              className="madani-input mt-2"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="mt-4 block text-sm font-extrabold text-[#0a1f5c]">
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
            className="madani-button mt-6 w-full bg-gradient-to-r from-[#f5c542] to-[#ffe08a] text-[#0a1f5c]"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
          <div className="my-4 flex items-center gap-3 text-xs font-semibold text-[#94a3b8]">
            <span className="h-px flex-1 bg-slate-200" />
            atau
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <button
            type="button"
            disabled={googleLoading || !hydrated}
            onClick={startGoogleLogin}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-extrabold text-[#0a1f5c] transition hover:border-[#0a1f5c]/30 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full border border-slate-200 text-sm font-black text-[#ea4335]">
              G
            </span>
            {googleLoading ? "Menghubungkan Google..." : "Masuk dengan Google"}
          </button>
          <p className="mt-3 text-xs leading-5 text-[#64748b]">
            Login Google aktif setelah email akun diverifikasi dari profil.
          </p>
        </form>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
