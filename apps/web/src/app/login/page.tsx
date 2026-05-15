"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, getAuthSessionKey, setToken } from "@/lib/api";
import { authMeQueryKey, type CurrentUser } from "@/lib/use-permissions";

type LoginPayload = {
  token: string;
  user: CurrentUser;
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
  const queryClient = useQueryClient();
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
          queryClient.clear();
          setToken(response.data.token);
          queryClient.setQueryData(authMeQueryKey(getAuthSessionKey()), {
            success: true,
            message: "Profil berhasil diambil.",
            data: response.data.user,
          });
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
  }, [queryClient, router, searchParams]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await apiFetch<LoginPayload>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      queryClient.clear();
      setToken(response.data.token);
      queryClient.setQueryData(authMeQueryKey(getAuthSessionKey()), {
        success: true,
        message: "Profil berhasil diambil.",
        data: response.data.user,
      });
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
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      <section className="relative flex min-h-[42vh] overflow-hidden bg-[#0a1f5c] p-6 text-white lg:min-h-screen lg:p-10">
        <Image
          src="/images/generated/hero-classroom.png"
          alt=""
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(7,23,68,0.88),rgba(18,60,140,0.68)),linear-gradient(0deg,rgba(7,23,68,0.88),rgba(7,23,68,0.08)_58%,rgba(7,23,68,0.32))]" />
        <div className="absolute inset-0 bg-[#123c8c]/28 mix-blend-multiply" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(0deg,rgba(7,23,68,0.92),transparent)]" />
        <div className="relative z-10 mt-auto max-w-xl">
          <Image
            src="/images/logo-madani-montessori.png"
            alt="Logo Madani"
            width={76}
            height={76}
            className="rounded-full border border-[#f5c542]/70 bg-white p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
            priority
          />
          <p className="mt-8 text-xs font-extrabold uppercase text-[#ffe08a]">
            Sistem Informasi Akademik
          </p>
          <h1 className="font-display mt-2 text-5xl font-extrabold leading-[0.9] sm:text-6xl">
            Madani Nidham
          </h1>
          <p className="mt-4 max-w-md text-sm font-medium leading-6 text-white/78">
            Operasional sekolah, akademik, komunikasi, dan layanan orang tua
            dalam satu dashboard.
          </p>
        </div>
      </section>

      <section className="flex min-h-[58vh] items-center justify-center px-5 py-8 lg:min-h-screen lg:px-10">
        <form onSubmit={submit} className="w-full max-w-[390px]">
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
