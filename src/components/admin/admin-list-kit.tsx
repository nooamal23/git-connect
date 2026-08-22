// Part 52 — shared presentation pieces for the admin people-style pages
// (stat cards, avatar, pagination). Extracted so المعلمون and الهيئة التسييرية
// share exactly the same visual system as التلاميذ.
import { useMemo, useState } from "react";

export function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-display text-2xl font-bold leading-none text-foreground">{value}</div>
        <div className="mt-1 truncate text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

export function PersonAvatar({ name, url }: { name: string; url?: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-primary/20"
      />
    );
  }
  const initial = name?.trim().charAt(0) || "?";
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-lg font-bold text-primary ring-2 ring-primary/20">
      {initial}
    </div>
  );
}

export function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <dt>{label}</dt>
      <dd className="text-foreground/80">{value}</dd>
    </div>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        active
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {active ? "نشط" : "غير نشط"}
    </span>
  );
}

/** Client-side pagination over an already-filtered list. */
export function usePagination<T>(items: T[], pageSize = 8) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pageCount);
  const slice = useMemo(
    () => items.slice((current - 1) * pageSize, current * pageSize),
    [items, current, pageSize],
  );
  return {
    page: current,
    setPage,
    pageCount,
    slice,
    from: items.length === 0 ? 0 : (current - 1) * pageSize + 1,
    to: Math.min(current * pageSize, items.length),
    total: items.length,
  };
}

export function Pagination({
  page,
  pageCount,
  from,
  to,
  total,
  noun,
  onPage,
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  noun: string;
  onPage: (p: number) => void;
}) {
  if (total === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground shadow-soft">
      <span>
        عرض {from} إلى {to} من أصل {total} {noun}
      </span>
      {pageCount > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => onPage(n)}
              className={`min-w-8 rounded-md border px-2 py-1 text-xs font-semibold ${
                n === page
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-secondary"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
