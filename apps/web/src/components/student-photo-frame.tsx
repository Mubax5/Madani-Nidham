"use client";

/* eslint-disable @next/next/no-img-element */

type StudentPhotoLike = {
  fullName?: string | null;
  gender?: string | null;
  photoUrl?: string | null;
};

const sizeClass = {
  sm: "w-12",
  md: "w-16",
  lg: "w-20",
  xl: "w-24",
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function StudentPhotoPlaceholder({
  gender,
  active = false,
}: {
  gender?: string | null;
  active?: boolean;
}) {
  const isFemale = String(gender ?? "").toUpperCase() === "P";

  return (
    <div
      className={cx(
        "relative h-full w-full overflow-hidden rounded-lg border",
        active ? "border-white/25 bg-white/18" : "border-slate-200 bg-slate-100",
      )}
      aria-hidden="true"
    >
      {isFemale ? (
        <span
            className={cx(
            "absolute left-1/2 top-[18%] h-[36%] w-[56%] -translate-x-1/2 rounded-t-full",
            active ? "bg-white/42" : "bg-slate-400",
          )}
        />
      ) : null}
      <span
        className={cx(
          "absolute left-1/2 top-[24%] h-[24%] w-[38%] -translate-x-1/2 rounded-full",
          active ? "bg-white/72" : "bg-slate-300",
        )}
      />
      <span
        className={cx(
          "absolute bottom-[12%] left-1/2 h-[34%] w-[62%] -translate-x-1/2 rounded-t-full",
          active ? "bg-white/58" : "bg-slate-300",
        )}
      />
    </div>
  );
}

export function StudentPhotoFrame({
  student,
  size = "md",
  active = false,
  className,
}: {
  student?: StudentPhotoLike | null;
  size?: keyof typeof sizeClass;
  active?: boolean;
  className?: string;
}) {
  const label = student?.fullName ? `Foto ${student.fullName}` : "Foto murid";

  return (
    <div className={cx("aspect-[3/4] shrink-0", sizeClass[size], className)}>
      {student?.photoUrl ? (
        <img
          src={student.photoUrl}
          alt={label}
          className={cx(
            "h-full w-full rounded-lg border object-cover",
            active ? "border-white/25" : "border-slate-200",
          )}
        />
      ) : (
        <StudentPhotoPlaceholder gender={student?.gender} active={active} />
      )}
    </div>
  );
}
