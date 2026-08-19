import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, Pencil, Trash2, Archive, IdCard, FolderOpen } from "lucide-react";
import { formatArabicDate, formatSimpleDate } from "@/lib/utils";
import { confirmToast } from "@/lib/confirm-toast";
import { useLiveSearch } from "@/lib/use-live-search";
import { SearchBox, NoResults } from "@/components/ui/search-box";
import { PersonFormDialog } from "@/components/admin/person-form-dialog";
import { CredentialCard } from "@/components/admin/credential-card";
import { StudentProfileDialog } from "@/components/admin/student-profile-dialog";



import {
  usePeopleStore,
  peopleActions,
  splitCourses,
  type Person,
  type Role,
} from "@/lib/people-store";

export function PeopleAdmin({ role }: { role: Role }) {
  const { people, courses } = usePeopleStore();
  const list = people.filter((p) => p.role === role);
  const { query, setQuery, filtered } = useLiveSearch(list, [
    (p) => p.fullName,
    (p) => p.username,
    (p) => p.phone,
    (p) => p.memberId ?? "",
  ]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  
  const [viewingCred, setViewingCred] = useState<Person | null>(null);
  const [viewingProfile, setViewingProfile] = useState<Person | null>(null);


  const title = role === "instructor" ? "المعلمون" : "التلاميذ";
  const singular = role === "instructor" ? "معلم" : "تلميذ";
  const desc =
    role === "instructor"
      ? "إدارة المعلمين والمعلمات ومسؤولياتهم على الدورات."
      : "إدارة التلاميذ وتسجيلهم في الدورات.";

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(p: Person) {
    setEditing(p);
    setOpen(true);
  }

  function remove(p: Person) {
    confirmToast({
      message: `حذف ${p.fullName}؟`,
      description: "لا يمكن التراجع عن هذا الإجراء.",
      onConfirm: () => {
        peopleActions.remove(p.id);
        toast.success(`تم حذف ${p.fullName}`);
      },
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90"
        >
          <UserPlus className="h-4 w-4" /> إضافة {singular}
        </button>
      </header>

      <SearchBox
        value={query}
        onChange={setQuery}
        placeholder={`ابحث عن ${singular} (الاسم، المعرف، الهاتف)...`}
      />

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          لا يوجد {singular} حاليا. اضغط "إضافة {singular}" للبدء.
        </div>
      ) : filtered.length === 0 ? (
        <NoResults />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((p) => {
            const { active, archived } = splitCourses(p, courses);
            return (
              <article key={p.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="flex items-start gap-4">
                  <Avatar name={p.fullName} url={p.photoUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {role === "student" && (p.memberId ?? p.username) && (
                          <span className="mb-1 inline-flex rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
                            {p.memberId ?? p.username}
                          </span>
                        )}
                        <h3 className="font-display text-base font-bold text-foreground">{p.fullName}</h3>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {role !== "student" && <span>@{p.username}</span>}
                          {role === "student" && p.createdAt && (
                            <span>تاريخ التسجيل: {formatSimpleDate(p.createdAt)}</span>
                          )}
                        </div>

                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {role === "student" && (
                          <button
                            onClick={() => setViewingProfile(p)}
                            className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-1.5 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                            title="ملف التلميذ (الأشهر المُخلَّصة)"
                          >
                            <FolderOpen className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setViewingCred(p)}
                          className="rounded-md border border-primary/30 bg-primary/5 p-1.5 text-primary hover:bg-primary/10"
                          title="بطاقة الاعتماد"
                        >
                          <IdCard className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded-md border border-border bg-background p-1.5 text-foreground hover:bg-secondary"
                          title="تعديل"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => remove(p)}
                          className="rounded-md border border-destructive/30 bg-background p-1.5 text-destructive hover:bg-destructive/10"
                          title="حذف"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                      <Row label="تاريخ الولادة" value={formatArabicDate(p.birthDate)} />

                      <Row label="الهاتف" value={p.phone || "—"} />
                      {role === "student" && (
                        <Row
                          label="المجموعة"
                          value={
                            p.groupNumber
                              ? `مجموعة ${p.groupNumber}${p.groupLevelName ? ` — ${p.groupLevelName}` : ""}`
                              : "بدون مجموعة"
                          }
                        />
                      )}
                    </dl>
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-border pt-3">
                  <CoursePills label="الدورات الحالية" items={active.map((c) => c.title)} tone="active" />
                  {archived.length > 0 && (
                    <CoursePills
                      label="الأرشيف"
                      items={archived.map((c) => c.title)}
                      tone="archived"
                      icon={<Archive className="h-3 w-3" />}
                    />
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {open && (
        <PersonFormDialog
          role={role}
          editing={editing}
          onClose={() => setOpen(false)}
        />
      )}
      {viewingCred && (
        <CredentialCard
          cred={{
            fullName: viewingCred.fullName,
            username: viewingCred.username,
            password:
              viewingCred.role === "student"
                ? viewingCred.birthDate
                : viewingCred.password || "••••••",
            role: viewingCred.role,
          }}
          onClose={() => setViewingCred(null)}
        />
      )}
      {viewingProfile && (
        <StudentProfileDialog
          student={viewingProfile}
          onClose={() => setViewingProfile(null)}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt>{label}</dt>
      <dd className="text-foreground/80">{value}</dd>
    </div>
  );
}

function Avatar({ name, url }: { name: string; url?: string }) {
  if (url) {
    return <img src={url} alt={name} className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/20" />;
  }
  const initial = name?.trim().charAt(0) || "?";
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-lg font-bold text-primary ring-2 ring-primary/20">
      {initial}
    </div>
  );
}

function CoursePills({
  label,
  items,
  tone,
  icon,
}: {
  label: string;
  items: string[];
  tone: "active" | "archived";
  icon?: React.ReactNode;
}) {
  const pillClass =
    tone === "active"
      ? "bg-primary/10 text-primary"
      : "bg-muted text-muted-foreground line-through";
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
        {icon} {label}
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground">—</div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((t) => (
            <span
              key={t}
              title={t}
              className={`inline-block max-w-full whitespace-normal break-words rounded-2xl px-2.5 py-1 text-xs font-medium leading-snug ${pillClass}`}
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

