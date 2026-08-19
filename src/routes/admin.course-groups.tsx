import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Printer, Trash2, Users2, X } from "lucide-react";
import { toast } from "sonner";

import { confirmToast } from "@/lib/confirm-toast";
import { noticeToast } from "@/lib/notice-toast";
import { useAutoRefresh, formatRefreshTime } from "@/hooks/use-auto-refresh";
import { SearchBox, NoResults } from "@/components/ui/search-box";
import { usePeopleStore, WEEKDAYS } from "@/lib/people-store";
import {
  rosterActions,
  type AvailableStudent,
  type ConflictMode,
  type CourseRoster,
  type RosterGroup,
  type RosterStudent,
} from "@/lib/roster-store";
import logoPng from "@/assets/logo.png";

export const Route = createFileRoute("/admin/course-groups")({
  // Part 29/4 — the dashboard "latest groups" widget links here with ?courseId=
  validateSearch: (search: Record<string, unknown>) => ({
    courseId: typeof search.courseId === "string" ? search.courseId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "أفواج الدورات والتلاميذ — الإدارة" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CourseGroupsRosterPage,
});

const CATEGORY_LABEL: Record<string, string> = {
  children: "أطفال",
  women: "نساء",
  men: "رجال",
  training: "تكوين معلمين",
  summer: "دورة صيفية",
};

function dayLabel(d: number) {
  return WEEKDAYS.find((w) => w.value === d)?.label ?? String(d);
}

function daysText(g: Pick<RosterGroup, "days">) {
  return g.days.length ? g.days.map(dayLabel).join("، ") : "—";
}

function timeText(g: Pick<RosterGroup, "timeFrom" | "timeTo">) {
  return g.timeFrom && g.timeTo ? `${g.timeFrom} - ${g.timeTo}` : "—";
}

function CourseGroupsRosterPage() {
  const { courses } = usePeopleStore();
  const { courseId: courseIdFromUrl } = Route.useSearch();
  const [courseId, setCourseId] = useState(courseIdFromUrl ?? "");
  const [roster, setRoster] = useState<CourseRoster | null>(null);
  const [loading, setLoading] = useState(false);
  const [picker, setPicker] = useState<RosterGroup | null>(null);
  const [printing, setPrinting] = useState(false);
  // Part 28/3 — locate an already-enrolled student across the course's groups.
  const [enrolledQuery, setEnrolledQuery] = useState("");

  // Default to the first course once the course list has hydrated.
  useEffect(() => {
    if (!courseId && courses.length > 0) setCourseId(courses[0]!.id);
  }, [courses, courseId]);

  const reload = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      setRoster(await rosterActions.getRoster(courseId));
    } catch (e) {
      toast.error(`تعذّر تحميل قائمة الدورة: ${(e as Error).message}`);
      setRoster(null);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { void reload(); }, [reload]);

  // Part 28/4 — data refreshes itself (tab focus + polling), no manual button.
  const { lastRefreshedAt, markRefreshed } = useAutoRefresh(async () => {
    await reload();
  }, { intervalMs: 45_000, enabled: Boolean(courseId) });

  const q = enrolledQuery.trim().toLowerCase();
  const matchedGroupIds = useMemo(() => {
    if (!q || !roster) return null;
    return new Set(
      roster.groups
        .filter((g) => g.students.some((s) => s.fullName.toLowerCase().includes(q)))
        .map((g) => g.id),
    );
  }, [q, roster]);
  const visibleGroups = useMemo(() => {
    if (!roster) return [];
    if (!matchedGroupIds) return roster.groups;
    return roster.groups.filter((g) => matchedGroupIds.has(g.id));
  }, [roster, matchedGroupIds]);

  const isQuran = roster?.type === "quran";

  function removeStudent(group: RosterGroup, s: RosterStudent) {
    confirmToast({
      message: `إزالة ${s.fullName} من الفوج ${group.number}؟`,
      description: "سيتم إلغاء تسجيل التلميذ في هذه الدورة. لن يُحذف التلميذ من قائمة التلاميذ.",
      variant: "danger",
      confirmLabel: "إزالة",
      onConfirm: async () => {
        try {
          await rosterActions.removeEnrollment(s.enrollmentId);
          toast.success("تمت الإزالة");
          await reload();
        } catch { /* notice dialog already shown */ }
      },
    });
  }

  return (
    <div className="space-y-6">
      <header className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">أفواج الدورات والتلاميذ</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            اختر دورة لعرض كل أفواجها وقائمة تلاميذها، وأضف أو أزل التلاميذ من كل فوج.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">الدورة</span>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="block w-64 rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            >
              <option value="" disabled>اختر الدورة</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </label>
          <span className="pb-1 text-xs text-muted-foreground">
            تحديث تلقائي · آخر تحديث: {formatRefreshTime(lastRefreshedAt)}
          </span>
          <button
            onClick={() => setPrinting(true)}
            disabled={!roster}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" /> طباعة
          </button>
        </div>
      </header>

      {loading && <div className="text-sm text-muted-foreground">جاري التحميل...</div>}

      {!loading && roster && (
        <>
          <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="font-display text-xl font-bold">{roster.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              الفئة المستهدفة:{" "}
              <span className="font-semibold text-foreground">
                {CATEGORY_LABEL[roster.category] ?? roster.category}
              </span>
              {" · "}عدد الأفواج:{" "}
              <span className="font-semibold text-foreground">{roster.groups.length}</span>
              {" · "}عدد التلاميذ:{" "}
              <span className="font-semibold text-foreground">
                {roster.groups.reduce((n, g) => n + g.students.length, 0)}
              </span>
            </p>
          </section>

          <div className="no-print">
            <SearchBox
              value={enrolledQuery}
              onChange={setEnrolledQuery}
              placeholder="ابحث عن تلميذ مسجّل لمعرفة فوجه..."
            />
            {q && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {visibleGroups.length === 0
                  ? "لا يوجد تلميذ مسجّل بهذا الاسم في هذه الدورة."
                  : `عدد الأفواج التي تحتوي على «${enrolledQuery.trim()}»: ${visibleGroups.length}`}
              </p>
            )}
          </div>

          {roster.groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              لا توجد أفواج في هذه الدورة. أضف فوجاً من صفحة «المستويات والمجموعات» أولاً.
            </div>
          ) : (
            <div className="space-y-4">
              {visibleGroups.map((g) => (
                <article key={g.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-secondary/40 p-4">
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-bold">الفوج {g.number}</h3>
                      <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                        <Info label="الأستاذ المسؤول" value={g.instructorName ?? "—"} />
                        <Info label="المستوى" value={g.levelName ?? "—"} />
                        <Info label="الأيام" value={daysText(g)} />
                        <Info label="التوقيت" value={timeText(g)} />
                        <Info label="رقم القاعة" value={g.room ?? "—"} />
                        {isQuran && <Info label="عدد الأحزاب" value={String(g.hizbCount)} />}
                      </dl>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-xs font-semibold">
                        <Users2 className="h-3.5 w-3.5" />
                        {g.students.length} / {g.capacity}
                      </span>
                      <button
                        onClick={() => setPicker(g)}
                        title="إضافة تلاميذ إلى هذا الفوج"
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                      >
                        <Plus className="h-4 w-4" /> إضافة تلميذ
                      </button>
                    </div>
                  </div>

                  {g.students.length === 0 ? (
                    <p className="p-5 text-sm text-muted-foreground">لا يوجد تلاميذ في هذا الفوج بعد.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-background/60 text-xs text-muted-foreground">
                        <tr>
                          <th className="w-12 px-4 py-2 text-start">#</th>
                          <th className="px-4 py-2 text-start">رقم الانخراط</th>
                          <th className="px-4 py-2 text-start">اسم التلميذ</th>
                          <th className="px-4 py-2 text-start">الهاتف</th>
                          <th className="w-16 px-4 py-2 text-start">حذف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {g.students.map((s, i) => (
                          <tr
                            key={s.enrollmentId}
                            className={q && s.fullName.toLowerCase().includes(q) ? "bg-primary/10" : undefined}
                          >
                            <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                            <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{s.memberId ?? s.username ?? "—"}</td>
                            <td className="px-4 py-2 font-semibold">{s.fullName}</td>
                            <td className="px-4 py-2 text-muted-foreground">{s.phone ?? "—"}</td>
                            <td className="px-4 py-2">
                              <button
                                onClick={() => removeStudent(g, s)}
                                title="إزالة من الفوج"
                                className="rounded-md border border-destructive/30 bg-background p-1.5 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {picker && roster && (
        <AddStudentsDialog
          courseId={roster.id}
          group={picker}
          onClose={() => setPicker(null)}
          onDone={async () => { setPicker(null); await reload(); markRefreshed(); }}
        />
      )}

      {printing && roster && (
        <PrintReport roster={roster} isQuran={isQuran} onClose={() => setPrinting(false)} />
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-muted-foreground">{label}:</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  );
}

// -------------------- Add students --------------------
function AddStudentsDialog({
  courseId, group, onClose, onDone,
}: {
  courseId: string; group: RosterGroup; onClose: () => void; onDone: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<AvailableStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Server-side exclusion: students already enrolled in THIS course (any group)
  // never appear here, since a student belongs to one group per course.
  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(async () => {
      setLoading(true);
      try {
        const list = await rosterActions.availableStudents(courseId, query);
        if (!cancelled) setRows(list);
      } catch (e) {
        if (!cancelled) toast.error(`تعذّر تحميل التلاميذ: ${(e as Error).message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, query ? 250 : 0);
    return () => { cancelled = true; window.clearTimeout(id); };
  }, [courseId, query]);

  const remaining = group.capacity - group.students.length;

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function submit(ids: string[], mode: ConflictMode) {
    if (ids.length === 0) return;
    setSaving(true);
    try {
      const res = await rosterActions.addStudentsWithMode(group.id, ids, mode);
      if (res.status === "conflict") {
        const conflicting = new Set(res.conflicts.map((c) => c.studentId));
        const rest = ids.filter((id) => !conflicting.has(id));
        noticeToast({
          variant: "warning",
          title: "تعارض في التوقيت",
          message: res.message,
          description:
            res.conflicts
              .map((c) => `${c.fullName}: ${c.conflicts.join(" ، ")}`)
              .join("\n") +
            (rest.length
              ? `\n\nيمكن إضافة ${rest.length} تلميذ بدون تعارض.`
              : "\n\nكل التلاميذ المختارين لديهم تعارض."),
          dismissLabel: "إلغاء",
          actions: [
            {
              label: "تجاهل التعارض وأضف الجميع",
              onClick: () => void submit(ids, "force"),
            },
            ...(rest.length
              ? [{
                  label: "أضف الباقي فقط",
                  style: "outline" as const,
                  onClick: () => void submit(rest, "force"),
                }]
              : []),
          ],
        });
        return;
      }
      toast.success(`تمت إضافة ${res.count} تلميذ إلى الفوج ${group.number}`);
      await onDone();
    } catch { /* notice dialog already shown; keep the dialog open */ }
    finally { setSaving(false); }
  }

  function confirm() {
    void submit([...selected], "check");
  }

  return (
    <Modal title={`إضافة تلاميذ إلى الفوج ${group.number}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          الطاقة الاستيعابية المتبقية: <span className="font-semibold text-foreground">{remaining < 0 ? 0 : remaining}</span>
          {" · "}لا تظهر هنا أسماء التلاميذ المسجّلين مسبقاً في هذه الدورة.
        </p>
        <SearchBox value={query} onChange={setQuery} placeholder="ابحث عن تلميذ بالاسم..." />
        <div className="max-h-[400px] overflow-y-auto rounded-lg border border-border">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">جاري التحميل...</p>
          ) : rows.length === 0 ? (
            <NoResults />
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((p) => (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-center gap-2 p-2.5 hover:bg-secondary/50">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{p.fullName}</span>
                      <span className="block text-xs text-muted-foreground">
                        @{p.username}{p.phone ? ` • ${p.phone}` : ""}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">تم اختيار {selected.size}</span>
          <button
            onClick={confirm}
            disabled={saving || selected.size === 0}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            إضافة المحدَّدين
          </button>
        </div>
      </div>
    </Modal>
  );
}

// -------------------- Printable report --------------------
function PrintReport({
  roster, isQuran, onClose,
}: {
  roster: CourseRoster; isQuran: boolean; onClose: () => void;
}) {
  return (
    <div className="print-overlay fixed inset-0 z-[60] overflow-y-auto bg-background">
      <div className="no-print sticky top-0 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Printer className="h-4 w-4" /> طباعة الآن
        </button>
        <button onClick={onClose} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary">
          <X className="h-4 w-4" /> إغلاق
        </button>
      </div>

      <div className="print-sheet mx-auto max-w-4xl bg-white p-8 text-black">
        {/* Branding header, matching the site navbar block */}
        <div className="flex items-center gap-3 border-b-2 border-black/20 pb-4">
          <img src={logoPng} alt="شعار الرابطة الوطنية للقرآن الكريم — فرع سيدي الهاني" className="h-20 w-20 shrink-0 object-contain" />
          <div className="leading-tight">
            <div className="font-display text-lg font-bold">فرع سيدي الهاني</div>
            <div className="text-xs">الرابطة الوطنية للقرآن الكريم</div>
          </div>
        </div>

        <div className="mt-5">
          <h1 className="font-display text-xl font-bold">قائمة أفواج الدورة: {roster.title}</h1>
          <p className="mt-1 text-sm">
            الفئة المستهدفة: {CATEGORY_LABEL[roster.category] ?? roster.category}
            {" · "}عدد الأفواج: {roster.groups.length}
            {" · "}عدد التلاميذ: {roster.groups.reduce((n, g) => n + g.students.length, 0)}
          </p>
        </div>

        {roster.groups.map((g) => (
          <section key={g.id} className="print-group mt-6">
            <h2 className="font-display text-lg font-bold">الفوج {g.number}</h2>
            <table className="mt-2 w-full border border-black/30 text-xs">
              <tbody>
                <tr>
                  <Th>الأستاذ المسؤول</Th><Td>{g.instructorName ?? "—"}</Td>
                  <Th>المستوى</Th><Td>{g.levelName ?? "—"}</Td>
                </tr>
                <tr>
                  <Th>الأيام</Th><Td>{daysText(g)}</Td>
                  <Th>التوقيت</Th><Td>{timeText(g)}</Td>
                </tr>
                <tr>
                  <Th>رقم القاعة</Th><Td>{g.room ?? "—"}</Td>
                  {isQuran ? (<><Th>عدد الأحزاب</Th><Td>{g.hizbCount}</Td></>) : (<><Th>عدد التلاميذ</Th><Td>{g.students.length}</Td></>)}
                </tr>
              </tbody>
            </table>

            <table className="mt-2 w-full border-collapse border border-black/30 text-xs">
              <thead>
                <tr className="bg-black/5">
                  <th className="border border-black/30 px-2 py-1 text-start w-12">#</th>
                  <th className="border border-black/30 px-2 py-1 text-start">اسم التلميذ</th>
                  <th className="border border-black/30 px-2 py-1 text-start">الهاتف</th>
                </tr>
              </thead>
              <tbody>
                {g.students.length === 0 ? (
                  <tr><td colSpan={3} className="border border-black/30 px-2 py-2 text-center">لا يوجد تلاميذ في هذا الفوج</td></tr>
                ) : g.students.map((s, i) => (
                  <tr key={s.enrollmentId}>
                    <td className="border border-black/30 px-2 py-1">{i + 1}</td>
                    <td className="border border-black/30 px-2 py-1">{s.fullName}</td>
                    <td className="border border-black/30 px-2 py-1">{s.phone ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="border border-black/30 bg-black/5 px-2 py-1 text-start font-semibold">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="border border-black/30 px-2 py-1">{children}</td>;
}

// -------------------- Shared --------------------
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4 py-8">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-elevated">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
