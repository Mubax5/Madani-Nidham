"use client";

/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  KeyRound,
  Mail,
  Phone,
  Save,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, clearToken } from "@/lib/api";
import { authMeQueryKey, usePermissions } from "@/lib/use-permissions";

type UserPayload = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  photoUrl?: string | null;
  emailVerifiedAt?: string | null;
  googleLinkedAt?: string | null;
  roles?: string[];
  permissions?: string[];
};

function initials(value?: string | null) {
  return (
    value
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item[0]?.toUpperCase())
      .join("") || "MN"
  );
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    super_admin: "Super Admin",
    kepala_sekolah: "Kepala Sekolah",
    admin: "Admin",
    guru: "Guru",
    orang_tua: "Orang Tua",
  };
  return labels[role] ?? role;
}

export function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = usePermissions();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const roleText = useMemo(
    () => (user?.roles ?? []).map(roleLabel).join(", ") || "Akun sekolah",
    [user?.roles],
  );

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setEmail(user.email ?? "");
    setPhone(user.phone ?? "");
  }, [user]);

  async function refreshUser(next?: UserPayload) {
    if (next) {
      queryClient.setQueryData(authMeQueryKey(), {
        success: true,
        message: "OK",
        data: next,
      });
    }
    await queryClient.invalidateQueries({ queryKey: ["auth"] });
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const response = await apiFetch<UserPayload>("/auth/profile", {
        method: "PUT",
        body: { name, email, phone },
      });
      await refreshUser(response.data);
      toast.success("Profil tersimpan");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Profil gagal disimpan",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photo) return;
    setSavingPhoto(true);
    try {
      const body = new FormData();
      body.append("photo", photo);
      const response = await apiFetch<UserPayload>("/auth/profile/photo", {
        method: "POST",
        body,
      });
      await refreshUser(response.data);
      setPhoto(null);
      toast.success("Foto profil diperbarui");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Foto gagal disimpan");
    } finally {
      setSavingPhoto(false);
    }
  }

  function pickPhoto(file?: File | null) {
    if (!file) {
      setPhoto(null);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Foto harus JPG, PNG, atau WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 2MB.");
      return;
    }
    setPhoto(file);
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPassword(true);
    try {
      await apiFetch<null>("/auth/change-password", {
        method: "PUT",
        body: {
          currentPassword,
          password,
          password_confirmation: passwordConfirmation,
        },
      });
      clearToken();
      queryClient.clear();
      toast.success("Password diganti. Login ulang.");
      router.replace("/login");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Password gagal diganti",
      );
    } finally {
      setSavingPassword(false);
    }
  }

  async function verifyGoogle() {
    setGoogleLoading(true);
    try {
      const redirectUri = `${window.location.origin}/login`;
      const response = await apiFetch<{ url: string }>(
        `/auth/google/url?mode=link&redirectUri=${encodeURIComponent(redirectUri)}`,
      );
      window.location.href = response.data.url;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Google OAuth belum dikonfigurasi",
      );
      setGoogleLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="madani-blue relative h-32 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.14)_0,rgba(255,255,255,0.05)_38%,rgba(10,31,92,0.24)_100%)]" />
          <div className="absolute -left-16 -top-24 h-56 w-56 rounded-full bg-white/8" />
          <div className="absolute right-12 top-0 h-32 w-56 -skew-x-12 bg-white/10" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-white/25" />
        </div>

        <div className="grid gap-3 p-3 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="-mt-16 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <form onSubmit={savePhoto} className="grid justify-items-center gap-3">
              <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-sm">
                {user?.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt="Foto profil"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xl font-extrabold text-[#0a1f5c]">
                    {initials(user?.name)}
                  </div>
                )}
                <label className="absolute bottom-1 right-1 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-[#0a1f5c] text-white shadow">
                  <Camera className="h-4 w-4" />
                  <input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      pickPhoto(event.target.files?.[0] ?? null)
                    }
                  />
                </label>
              </div>
              <div className="min-w-0 text-center">
                <h1 className="truncate text-base font-extrabold text-[#0a1f5c]">
                  {user?.name ?? "Profil"}
                </h1>
                <p className="mt-0.5 truncate text-xs font-semibold text-[#64748b]">
                  {roleText}
                </p>
              </div>
              <button
                className="madani-button min-h-[30px] w-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-[#0a1f5c]"
                disabled={!photo || savingPhoto}
              >
                <Camera className="h-3.5 w-3.5" />
                {savingPhoto ? "Menyimpan..." : "Simpan foto"}
              </button>
            </form>

            <div className="mt-3 grid divide-y divide-slate-100 border-t border-slate-100 pt-2">
              <ProfileStat
                label="Email"
                value={user?.emailVerifiedAt ? "Terverifikasi" : "Belum"}
                tone={user?.emailVerifiedAt ? "ok" : "warn"}
              />
              <ProfileStat
                label="Google"
                value={user?.googleLinkedAt ? "Aktif" : "Belum aktif"}
                tone={user?.googleLinkedAt ? "ok" : "warn"}
              />
              <ProfileStat
                label="Telepon"
                value={user?.phone || "-"}
              />
            </div>
          </aside>

          <div className="grid gap-3">
            <section className="rounded-lg border border-slate-200 bg-white">
              <div className="flex min-h-10 items-center gap-4 overflow-x-auto border-b border-slate-200 px-3 text-xs font-bold">
                <span className="border-b-2 border-[#0a1f5c] py-3 text-[#0a1f5c]">
                  Pengaturan Akun
                </span>
              </div>

              <form onSubmit={saveProfile}>
                <div className="grid gap-3 p-3 md:grid-cols-2">
                  <ProfileField label="Nama">
                    <input
                      className="madani-input"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                    />
                  </ProfileField>
                  <ProfileField label="No HP">
                    <input
                      className="madani-input"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </ProfileField>
                  <ProfileField label="Email login">
                    <input
                      className="madani-input"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </ProfileField>
                  <ProfileField label="Role">
                    <input className="madani-input" value={roleText} readOnly />
                  </ProfileField>
                </div>
                <div className="border-t border-slate-200 p-3">
                  <button
                    className="madani-button min-h-[30px] bg-[#0a1f5c] px-3 py-1 text-xs text-white"
                    disabled={savingProfile}
                  >
                    <Save className="h-3.5 w-3.5" />
                    {savingProfile ? "Menyimpan..." : "Update"}
                  </button>
                </div>
              </form>
            </section>

            <section className="grid gap-3 xl:grid-cols-[1fr_0.75fr]">
              <form
                onSubmit={changePassword}
                className="rounded-lg border border-slate-200 bg-white p-3"
              >
                <SectionTitle
                  icon={<KeyRound className="h-4 w-4" />}
                  title="Keamanan"
                />
                <div className="mt-3 grid gap-3">
                  <ProfileField label="Password lama">
                    <input
                      className="madani-input"
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      required
                    />
                  </ProfileField>
                  <ProfileField label="Password baru">
                    <input
                      className="madani-input"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={8}
                      required
                    />
                  </ProfileField>
                  <ProfileField label="Konfirmasi">
                    <input
                      className="madani-input"
                      type="password"
                      value={passwordConfirmation}
                      onChange={(event) =>
                        setPasswordConfirmation(event.target.value)
                      }
                      minLength={8}
                      required
                    />
                  </ProfileField>
                </div>
                <button
                  className="madani-button mt-3 min-h-[30px] bg-[#0a1f5c] px-3 py-1 text-xs text-white"
                  disabled={savingPassword}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {savingPassword ? "Memproses..." : "Ganti password"}
                </button>
              </form>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <SectionTitle
                  icon={<BadgeCheck className="h-4 w-4" />}
                  title="Verifikasi Google"
                />
                <p className="mt-2 text-xs leading-5 text-[#64748b]">
                  Email Google harus sama dengan email akun.
                </p>
                <button
                  type="button"
                  onClick={verifyGoogle}
                  disabled={googleLoading}
                  className="madani-button mt-3 min-h-[30px] w-full bg-[#0a1f5c] px-3 py-1 text-xs text-white"
                >
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {googleLoading ? "Membuka..." : "Verifikasi Google"}
                </button>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-bold text-[#0a1f5c]">
      {label}
      {children}
    </label>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-extrabold text-[#0a1f5c]">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-[#0a1f5c]">
        {icon}
      </span>
      {title}
    </div>
  );
}

function ProfileStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  const icon =
    label === "Telepon" ? (
      <Phone className="h-3.5 w-3.5" />
    ) : label === "Email" ? (
      <Mail className="h-3.5 w-3.5" />
    ) : (
      <CheckCircle2 className="h-3.5 w-3.5" />
    );

  return (
    <div className="flex items-center justify-between gap-3 py-2 text-xs">
      <span className="inline-flex items-center gap-1.5 font-bold text-[#0a1f5c]">
        {icon}
        {label}
      </span>
      <span
        className={`truncate rounded-full px-2 py-1 font-bold ${
          tone === "ok"
            ? "bg-emerald-50 text-emerald-700"
            : tone === "warn"
              ? "bg-amber-50 text-amber-700"
              : "bg-slate-100 text-slate-600"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
