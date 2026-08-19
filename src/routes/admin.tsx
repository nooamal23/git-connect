import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  CalendarRange,
  Newspaper,
  Wallet,
  LogOut,
  Menu,
  ShieldCheck,
  Trophy,
  Camera,
  Inbox,
  Users2,
  ClipboardList,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { listRegistrationRequests } from "@/lib/registration-requests";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "فضاء الإدارة — فرع سيدي الهاني" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const ADMIN_NAV = [
  { to: "/admin", label: "لوحة القيادة", icon: LayoutDashboard, exact: true },
  { to: "/admin/registration-requests", label: "طلبات التسجيل", icon: Inbox, exact: false, badge: "pending" as const },
  { to: "/admin/board", label: "الهيئة التسييرية", icon: ShieldCheck, exact: false },
  { to: "/admin/instructors", label: "المعلمون", icon: GraduationCap, exact: false },
  { to: "/admin/students", label: "التلاميذ", icon: Users, exact: false },
  { to: "/admin/groups", label: "المستويات والمجموعات", icon: Users2, exact: false },
  { to: "/admin/course-groups", label: "أفواج الدورات والتلاميذ", icon: ClipboardList, exact: false },
  { to: "/admin/courses", label: "الدورات", icon: BookOpen, exact: false },
  { to: "/admin/seasons", label: "المواسم الدراسية", icon: CalendarRange, exact: false },
  { to: "/admin/news", label: "الأخبار", icon: Newspaper, exact: false },

  { to: "/admin/competitions", label: "المسابقات", icon: Trophy, exact: false },
  { to: "/admin/gallery", label: "المعرض", icon: Camera, exact: false },
  { to: "/admin/finance", label: "المالية", icon: Wallet, exact: false },
] as const;

function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    let cancelled = false;
    async function refresh() {
      try {
        const rows = await listRegistrationRequests("pending");
        if (!cancelled) setPendingCount(rows.length);
      } catch {
        // silent — badge just stays at its previous value
      }
    }
    void refresh();
    const id = window.setInterval(refresh, 60_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [user, pathname]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/admin-access" });
    else if (!loading && user && user.role !== "admin") navigate({ to: "/" });
  }, [user, loading, navigate]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="container-page py-20 text-center text-muted-foreground">
        جاري التحقق من الصلاحيات...
      </div>
    );
  }

  return (
    <div className="bg-surface">
      <div className="container-page py-6">
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold"
          >
            <Menu className="h-4 w-4" />
            القائمة
          </button>
          <button
            onClick={() => { logout(); navigate({ to: "/" }); }}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-destructive"
          >
            <LogOut className="h-4 w-4" /> خروج
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className={`${mobileOpen ? "block" : "hidden"} lg:block`}>
            <div className="sticky top-20 rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="mb-4 rounded-xl bg-hero p-4 text-primary-foreground">
                <div className="text-xs opacity-80">مرحبا</div>
                <div className="font-display text-lg font-bold">{user.fullName}</div>
                <div className="mt-1 text-xs opacity-80">@{user.username}</div>
              </div>
              <nav className="space-y-1">
                {ADMIN_NAV.map((item) => {
                  const Icon = item.icon;
                  const active = item.exact
                    ? pathname === "/admin"
                    : pathname.startsWith(item.to);
                  const showBadge = "badge" in item && item.badge === "pending" && pendingCount > 0;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground shadow-soft"
                          : "text-foreground/80 hover:bg-secondary"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{item.label}</span>
                      {showBadge && (
                        <span
                          className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                            active
                              ? "bg-primary-foreground text-primary"
                              : "bg-destructive text-white"
                          }`}
                        >
                          {pendingCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
              <button
                onClick={() => { logout(); navigate({ to: "/" }); }}
                className="mt-4 hidden w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 lg:flex"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </button>
            </div>
          </aside>

          <section className="min-w-0">
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  );
}
