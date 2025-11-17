import { Outlet, NavLink, useNavigate } from "react-router-dom";
import Topbar from "./Topbar";
import { AppProvider } from "@/app/state/AppProvider";
import { useApp } from "@/app/state/useApp";

function Sidebar() {
  const navigate = useNavigate();
  const { user } = useApp();

  const menu = [
    {
      to: "/app",
      label: "Dashboard",
      icon: "🏠",
      roles: ["admin", "teacher", "bursar", "viewer"],
    },
    { to: "/app/terms", label: "Terms", icon: "🗓️", roles: ["admin"] },
    {
      to: "/app/fee-settings",
      label: "Fee Settings",
      icon: "💰",
      roles: ["admin", "bursar"],
    },
    // ...
    { to: "/app/classes", label: "Classes", icon: "🏫", roles: ["admin"] },
    {
      to: "/app/students",
      label: "Students",
      icon: "👩🏽‍🎓",
      roles: ["admin", "teacher", "bursar", "viewer"],
    },
    {
      to: "/app/attendance",
      label: "Attendance",
      icon: "🗓️",
      roles: ["admin", "teacher"],
    },
    { to: "/app/fees", label: "Fees", icon: "💳", roles: ["admin", "bursar"] },
    { to: "/app/teachers", label: "Teachers", icon: "🧑🏽‍🏫", roles: ["admin"] },
    { to: "/app/subjects", label: "Subjects", icon: "📚", roles: ["admin"] },
    { to: "/app/users", label: "Users", icon: "👥", roles: ["admin"] },
    {
      to: "/app/guardians",
      label: "Guardians",
      icon: "👨‍👩‍👧",
      roles: ["admin", "teacher"],
    },
    {
      to: "/app/reports/debtors",
      label: "Debtors",
      icon: "📄",
      roles: ["admin", "bursar"],
    },
    {
      to: "/app/exams/my",
      label: "My Subjects",
      icon: "📝",
      roles: ["teacher"],
    },
    {
      to: "/app/exams/grades",
      label: "Grade Scheme",
      icon: "📐",
      roles: ["admin", "teacher"],
    },
    {
      to: "/app/exams/results",
      label: "Results",
      icon: "📊",
      roles: ["admin", "teacher"],
    },
    {
      to: "/app/exams/report-card",
      label: "Report Card",
      icon: "📜",
      roles: [],
    }, // mostly navigated via Results
    {
      to: "/app/exams/my-form",
      label: "Form Teacher",
      icon: "🏅",
      roles: ["admin", "teacher"],
    },
  ];

  return (
    <aside className="bg-white border-r">
      <div className="flex items-center h-16 gap-3 px-4 border-b">
        <img src="/school.png" alt="logo" className="w-8 h-8 rounded" />
        <span className="font-semibold">Student Portal</span>
      </div>

      <nav className="p-3 space-y-1">
        {menu
          .filter((m) => user && m.roles.includes(user.role))
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/app"}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition
                 ${
                   isActive
                     ? "bg-[hsl(var(--ring))]/30 text-[hsl(var(--foreground))] font-medium"
                     : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                 }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
      </nav>

      <div className="mt-auto p-3 text-xs text-[hsl(var(--muted-foreground))]">
        <button
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/auth", { replace: true });
          }}
          className="w-full text-left px-3 py-2 rounded-lg hover:bg-[hsl(var(--muted))]"
        >
          🔐 Logout
        </button>
      </div>
    </aside>
  );
}

export default function AppLayout() {
  return (
    <AppProvider>
      <div className="min-h-screen grid grid-cols-[240px_1fr] bg-[hsl(var(--muted))]">
        <Sidebar />
        <div className="min-h-screen">
          <Topbar />
          <main className="p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </AppProvider>
  );
}
