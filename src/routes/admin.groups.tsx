import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, X, Pencil, Trash2, Users2, ArrowLeft, Printer } from "lucide-react";
import { toast } from "sonner";
import { confirmToast } from "@/lib/confirm-toast";
import {
  useLevelsGroups,
  levelsActions,
  studentGroupsActions,
  type Level,
  type StudentGroup,
  type GroupStudent,
} from "@/lib/levels-groups-store";
import { usePeopleStore, isMemorizationCourse, WEEKDAYS, AUDIENCE_LABEL } from "@/lib/people-store";
import logoPng from "@/assets/logo.png";
import { TimeInput24 } from "@/components/ui/time-input-24";

export const Route = createFileRoute("/admin/groups")({
  head: () => ({
    meta: [
      { title: "المستويات والمجموعات — الإدارة" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GroupsAdminPage,
});

type Tab = "levels" | "groups";

function GroupsAdminPage() {
  const { levels, groups } = useLevelsGroups();
  const [tab, setTab] = useState<Tab>("groups");
  const [openLevel, setOpenLevel] = useState<Level | "new" | null>(null);
  const [openGroup, setOpenGroup] = useState<StudentGroup | "new" | null>(null);
  const [detail, setDetail] = useState<StudentGroup | null>(null);

  if (detail) {
    return <GroupDetailView group={detail} onBack={() => setDetail(null)} />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">المستويات والمجموعات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            نظّم التلاميذ في مجموعات مرتبطة بمستويات (كل مستوى يحدّد عدد الأحزاب المطلوبة).
          </p>
        </div>
      </header>

      <div className="flex gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        <TabBtn active={tab === "groups"} onClick={() => setTab("groups")}>المجموعات</TabBtn>
        <TabBtn active={tab === "levels"} onClick={() => setTab("levels")}>المستويات</TabBtn>
      </div>

      {tab === "levels" ? (
        <LevelsList levels={levels} onAdd={() => setOpenLevel("new")} onEdit={setOpenLevel} />
      ) : (
        <GroupsList
          groups={groups}
          levels={levels}
          onAdd={() => setOpenGroup("new")}
          onEdit={setOpenGroup}
          onOpen={setDetail}
        />
      )}

      {openLevel && (
        <LevelFormDialog editing={openLevel === "new" ? null : openLevel} onClose={() => setOpenLevel(null)} />
      )}
      {openGroup && (
        <GroupFormDialog
          editing={openGroup === "new" ? null : openGroup}
          levels={levels}
          groups={groups}
          onClose={() => setOpenGroup(null)}
        />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
        active ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground/70 hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}

// -------------------- Levels --------------------
function LevelsList({ levels, onAdd, onEdit }: { levels: Level[]; onAdd: () => void; onEdit: (l: Level) => void }) {
  function remove(l: Level) {
    confirmToast({
      message: `حذف المستوى "${l.name}"؟`,
      description: l.groupsCount > 0 ? `هذا المستوى يحتوي على ${l.groupsCount} مجموعة — لن يتم الحذف حتى تُزال مجموعاته أولاً.` : undefined,
      onConfirm: async () => {
        try { await levelsActions.remove(l.id); toast.success("تم حذف المستوى"); } catch {}
      },
    });
  }
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={onAdd} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90">
          <Plus className="h-4 w-4" /> مستوى جديد
        </button>
      </div>
      {levels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          لا توجد مستويات. اضغط «مستوى جديد» للبدء.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {levels.map((l) => (
            <article key={l.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg font-bold">{l.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    عدد المجموعات: <span className="font-semibold text-foreground">{l.groupsCount}</span>
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => onEdit(l)} className="rounded-md border border-border bg-background p-1.5 hover:bg-secondary" title="تعديل">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => remove(l)} className="rounded-md border border-destructive/30 bg-background p-1.5 text-destructive hover:bg-destructive/10" title="حذف">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function LevelFormDialog({ editing, onClose }: { editing: Level | null; onClose: () => void }) {
  const [name, setName] = useState(editing?.name ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) { await levelsActions.update(editing.id, { name }); toast.success("تم حفظ التغييرات"); }
      else { await levelsActions.add({ name }); toast.success("تم إنشاء المستوى"); }
      onClose();
    } catch {}
  }

  return (
    <Modal title={editing ? "تعديل المستوى" : "مستوى جديد"} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-3">
        <Field label="اسم المستوى">
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="مثال: المستوى الأول" />
        </Field>
        <button type="submit" className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
          {editing ? "حفظ" : "إنشاء"}
        </button>
      </form>
    </Modal>
  );
}

// -------------------- Groups --------------------
function GroupsList({
  groups, levels, onAdd, onEdit, onOpen,
}: {
  groups: StudentGroup[]; levels: Level[]; onAdd: () => void; onEdit: (g: StudentGroup) => void; onOpen: (g: StudentGroup) => void;
}) {
  function remove(g: StudentGroup) {
    confirmToast({
      message: `حذف المجموعة رقم "${g.number}"؟`,
      description: "سيتم إلغاء ربط التلاميذ بهذه المجموعة، ولن يُحذف أي تلميذ.",
      onConfirm: async () => {
        try { await studentGroupsActions.remove(g.id); toast.success("تم حذف المجموعة"); } catch {}
      },
    });
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {levels.length === 0 && (
          <span className="text-xs text-muted-foreground">أنشئ مستوىً أولاً قبل إضافة المجموعات.</span>
        )}
        <button
          onClick={onAdd}
          disabled={levels.length === 0}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> مجموعة جديدة
        </button>
      </div>
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          لا توجد مجموعات بعد.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {groups.map((g) => (
            <article key={g.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => onOpen(g)} className="min-w-0 flex-1 text-right">
                  <h3 className="font-display text-lg font-bold text-primary hover:underline">مجموعة {g.number}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    الدورة: <span className="font-semibold text-foreground">{g.courseTitle ?? "—"}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    المستوى: <span className="font-semibold text-foreground">{g.levelName ?? "—"}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    المعلم: <span className="font-semibold text-foreground">{g.instructorName ?? "—"}</span>
                    {g.timeFrom && g.timeTo ? ` · ${g.timeFrom} - ${g.timeTo}` : ""}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground flex items-center gap-1">
                    <Users2 className="h-3.5 w-3.5" /> {g.studentsCount} / {g.capacity} تلميذ
                  </p>
                </button>
                <div className="flex gap-1.5">
                  <button onClick={() => onEdit(g)} className="rounded-md border border-border bg-background p-1.5 hover:bg-secondary" title="تعديل">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => remove(g)} className="rounded-md border border-destructive/30 bg-background p-1.5 text-destructive hover:bg-destructive/10" title="حذف">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

// Next free group number for a course: MAX(number) + 1, or 1 when it has none.
function nextGroupNumber(groups: StudentGroup[], courseId: string) {
  const used = groups.filter((g) => g.courseId === courseId).map((g) => g.number);
  return used.length === 0 ? 1 : Math.max(...used) + 1;
}

function GroupFormDialog({ editing, levels, groups, onClose }: { editing: StudentGroup | null; levels: Level[]; groups: StudentGroup[]; onClose: () => void }) {
  const { people, courses } = usePeopleStore();
  const instructors = useMemo(() => people.filter((p) => p.role === "instructor"), [people]);
  const initialCourseId = editing?.courseId ?? courses[0]?.id ?? "";
  const [courseId, setCourseId] = useState(initialCourseId);
  const [number, setNumber] = useState<number>(
    editing?.number ?? nextGroupNumber(groups, initialCourseId),
  );
  const [levelId, setLevelId] = useState(editing?.levelId ?? "");
  const [hizbCount, setHizbCount] = useState<number>(editing?.hizbCount ?? 0);
  const [instructorId, setInstructorId] = useState(editing?.instructorId ?? "");
  const [room, setRoom] = useState(editing?.room ?? "");
  const [capacity, setCapacity] = useState<number>(editing?.capacity ?? 25);
  const [days, setDays] = useState<number[]>(editing?.days ?? []);
  const [timeFrom, setTimeFrom] = useState(editing?.timeFrom ?? "");
  const [timeTo, setTimeTo] = useState(editing?.timeTo ?? "");

  // عدد الأحزاب only applies to memorization courses (children/women/men);
  // فقه وشريعة / تكوين معلمين / دورات صيفية have no hizb progress. The
  // instructor schedule-conflict rule still applies to every category.
  const selectedCourse = courses.find((c) => c.id === courseId);
  const showHizb = isMemorizationCourse(selectedCourse);

  function toggleDay(d: number) {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  }

  // Switching the course re-computes the suggested number (creation only);
  // the admin can still override it manually.
  function changeCourse(id: string) {
    setCourseId(id);
    if (!editing) setNumber(nextGroupNumber(groups, id));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId) return;
    const payload = {
      courseId,
      number,
      levelId: levelId || null,
      ...(showHizb ? { hizbCount } : {}),
      instructorId: instructorId || null,
      room: room || null,
      capacity,
      days,
      timeFrom: timeFrom || null,
      timeTo: timeTo || null,
    };
    try {
      if (editing) { await studentGroupsActions.update(editing.id, payload); toast.success("تم حفظ التغييرات"); }
      else { await studentGroupsActions.add(payload); toast.success("تم إنشاء المجموعة"); }
      onClose();
    } catch {}
  }
  return (
    <Modal title={editing ? "تعديل المجموعة" : "مجموعة جديدة"} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-3">
        <Field label="الدورة">
          <select required value={courseId} onChange={(e) => changeCourse(e.target.value)} className={inputClass}>
            <option value="" disabled>اختر الدورة</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </Field>
        <Field label="رقم المجموعة">
          <input type="number" min={1} required value={number} onChange={(e) => setNumber(Number(e.target.value))} className={inputClass} placeholder="مثال: 1" />
        </Field>
        <Field label="المستوى (اختياري)">
          <select value={levelId} onChange={(e) => setLevelId(e.target.value)} className={inputClass}>
            <option value="">— بدون مستوى —</option>
            {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
        {showHizb ? (
          <Field label="عدد الأحزاب">
            <input
              type="number"
              min={0}
              max={60}
              value={hizbCount}
              onChange={(e) => setHizbCount(Number(e.target.value))}
              className={inputClass}
            />
          </Field>
        ) : (
          selectedCourse && (
            <div className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              عدد الأحزاب لا ينطبق على هذا النوع من الدورات (فقه وشريعة / تكوين معلمين / دورات صيفية).
            </div>
          )
        )}
        <Field label="المعلم (اختياري)">
          <select value={instructorId} onChange={(e) => setInstructorId(e.target.value)} className={inputClass}>
            <option value="">— بدون معلم —</option>
            {instructors.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
          </select>
        </Field>
        <Field label="الطاقة الاستيعابية">
          <input type="number" min={1} required value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className={inputClass} />
        </Field>
        <Field label="القاعة (اختياري)">
          <input value={room} onChange={(e) => setRoom(e.target.value)} className={inputClass} placeholder="مثال: قاعة 2" />
        </Field>
        <Field label="أيام الحصص">
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((w) => (
              <button
                key={w.value}
                type="button"
                onClick={() => toggleDay(w.value)}
                className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                  days.includes(w.value)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-secondary"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="من الساعة">
            <TimeInput24 value={timeFrom} onChange={setTimeFrom} />
          </Field>
          <Field label="إلى الساعة">
            <TimeInput24 value={timeTo} onChange={setTimeTo} />
          </Field>
        </div>
        <button type="submit" className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
          {editing ? "حفظ" : "إنشاء"}
        </button>
      </form>
    </Modal>
  );
}

// -------------------- Group detail (read-only roster + print) --------------------
function daysText(days: number[] | undefined) {
  if (!days || days.length === 0) return "—";
  const order = WEEKDAYS.map((d) => d.value);
  return [...days]
    .sort((a, b) => order.indexOf(a as never) - order.indexOf(b as never))
    .map((d) => WEEKDAYS.find((w) => w.value === d)?.label ?? d)
    .join("، ");
}

function GroupDetailView({ group, onBack }: { group: StudentGroup; onBack: () => void }) {
  const { people, courses } = usePeopleStore();
  const [students, setStudents] = useState<GroupStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    studentGroupsActions
      .listStudents(group.id)
      .then((rows) => { if (alive) setStudents(rows); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [group.id]);

  const course = courses.find((c) => c.id === group.courseId);
  const audience = course?.audience ? AUDIENCE_LABEL[course.audience] : "—";
  const showHizb = isMemorizationCourse(course);
  const rows = useMemo(
    () =>
      students.map((s) => {
        const person = people.find((p) => p.id === s.id);
        return {
          id: s.id,
          code: person?.memberId ?? s.username,
          fullName: s.fullName,
          phone: s.phone ?? "—",
        };
      }),
    [students, people],
  );

  const info: { label: string; value: React.ReactNode }[] = [
    { label: "الدورة", value: group.courseTitle ?? course?.title ?? "—" },
    { label: "الفئة المستهدفة", value: audience },
    { label: "الأستاذ المسؤول", value: group.instructorName ?? "—" },
    { label: "الأيام", value: daysText(group.days) },
    { label: "التوقيت", value: group.timeFrom && group.timeTo ? `${group.timeFrom} - ${group.timeTo}` : "—" },
    { label: "المستوى", value: group.levelName ?? "—" },
    ...(showHizb ? [{ label: "عدد الأحزاب", value: group.hizbCount ?? 0 }] : []),
    { label: "عدد التلاميذ", value: rows.length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-secondary">
          <ArrowLeft className="h-4 w-4" /> رجوع للمجموعات
        </button>
        <button onClick={() => setPrinting(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90">
          <Printer className="h-4 w-4" /> طباعة القائمة
        </button>
      </div>

      <header className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <h1 className="font-display text-2xl font-bold">مجموعة {group.number}</h1>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {info.map((i) => (
            <div key={i.label} className="flex gap-1.5">
              <dt className="text-muted-foreground">{i.label}:</dt>
              <dd className="font-semibold text-foreground">{i.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      {loading ? (
        <div className="text-sm text-muted-foreground">جاري التحميل...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          لا يوجد تلاميذ في هذه المجموعة بعد.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr>
                <th className="px-3 py-2 text-start font-semibold">المعرف الوحيد</th>
                <th className="px-3 py-2 text-start font-semibold">الاسم واللقب</th>
                <th className="px-3 py-2 text-start font-semibold">رقم الهاتف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                  <td className="px-3 py-2 font-semibold">{r.fullName}</td>
                  <td className="px-3 py-2">{r.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {printing && (
        <PrintGroupRoster
          group={group}
          info={info}
          rows={rows}
          onClose={() => setPrinting(false)}
        />
      )}
    </div>
  );
}

function PrintGroupRoster({
  group, info, rows, onClose,
}: {
  group: StudentGroup;
  info: { label: string; value: React.ReactNode }[];
  rows: { id: string; code: string; fullName: string; phone: string }[];
  onClose: () => void;
}) {
  return (
    <div className="print-overlay fixed inset-0 z-[60] overflow-y-auto bg-background">
      <div className="no-print sticky top-0 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <Printer className="h-4 w-4" /> طباعة الآن
        </button>
        <button onClick={onClose} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary">
          <X className="h-4 w-4" /> إغلاق
        </button>
      </div>

      <div className="print-sheet mx-auto max-w-3xl bg-white p-8 text-black">
        <div className="flex items-center gap-3 border-b-2 border-black/20 pb-4">
          <img src={logoPng} alt="شعار الرابطة الوطنية للقرآن الكريم — فرع سيدي الهاني" className="h-20 w-20 shrink-0 object-contain" />
          <div className="leading-tight">
            <div className="font-display text-lg font-bold">فرع سيدي الهاني</div>
            <div className="text-xs">الرابطة الوطنية للقرآن الكريم</div>
          </div>
        </div>

        <h1 className="mt-6 font-display text-xl font-bold">قائمة تلاميذ المجموعة {group.number}</h1>

        <table className="mt-4 w-full border-collapse border border-black/30 text-sm">
          <tbody>
            {info.map((i) => (
              <tr key={i.label}>
                <th className="w-48 border border-black/30 bg-black/5 px-3 py-2 text-start font-semibold">{i.label}</th>
                <td className="border border-black/30 px-3 py-2">{i.value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="mt-5 w-full border-collapse border border-black/30 text-xs">
          <thead>
            <tr className="bg-black/5">
              <th className="border border-black/30 px-2 py-1 text-start w-10">#</th>
              <th className="border border-black/30 px-2 py-1 text-start">المعرف الوحيد</th>
              <th className="border border-black/30 px-2 py-1 text-start">الاسم واللقب</th>
              <th className="border border-black/30 px-2 py-1 text-start">رقم الهاتف</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="border border-black/30 px-2 py-2 text-center">لا يوجد تلاميذ في هذه المجموعة</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.id}>
                <td className="border border-black/30 px-2 py-1">{i + 1}</td>
                <td className="border border-black/30 px-2 py-1 font-mono">{r.code}</td>
                <td className="border border-black/30 px-2 py-1">{r.fullName}</td>
                <td className="border border-black/30 px-2 py-1">{r.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// -------------------- Shared UI --------------------
const inputClass =
  "block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4 py-8">
      <div className={`max-h-full w-full ${wide ? "max-w-2xl" : "max-w-md"} overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-elevated`}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
