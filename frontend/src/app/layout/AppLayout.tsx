// src/app/layout/AppLayout.tsx
import { Outlet, NavLink } from "react-router-dom";
import Topbar from "./Topbar";
import { AppProvider } from "@/app/state/AppProvider";
import { useApp } from "@/app/state/useApp";
import {
  House,
  CalendarDays,
  DollarSign,
  School,
  Calendar1,
  Baby,
  PersonStanding,
  Bandage,
  BookA,
  ClipboardPlus,
  ChartColumn,
  Scale,
  Flag,
  HandPlatter,
  Users,
  BookCopy,
  ChevronRight,
  GraduationCap,
  Sparkles,
  Settings,
  LogOut,
  UserCircle,
  Menu,
  X,
  FileText,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";

function Sidebar() {
  const { user } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Memoized menu configuration to prevent recalculation
  const menuItems = useMemo(
    () => [
      {
        to: "/app",
        label: "Dashboard",
        icon: House,
        roles: ["admin", "teacher", "bursar", "viewer"],
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-500",
      },
      {
        to: "/app/terms",
        label: "Terms",
        icon: CalendarDays,
        roles: ["admin"],
        color: "text-emerald-600",
        bgColor: "bg-emerald-50",
        borderColor: "border-emerald-500",
      },
      {
        to: "/app/fee-settings",
        label: "Fee Settings",
        icon: DollarSign,
        roles: ["admin", "bursar"],
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-500",
      },
      {
        to: "/app/classes",
        label: "Classes",
        icon: School,
        roles: ["admin"],
        color: "text-indigo-600",
        bgColor: "bg-indigo-50",
        borderColor: "border-indigo-500",
      },
      {
        to: "/app/students",
        label: "Students",
        icon: PersonStanding,
        roles: ["admin", "teacher", "bursar", "viewer"],
        color: "text-purple-600",
        bgColor: "bg-purple-50",
        borderColor: "border-purple-500",
      },
      {
        to: "/app/attendance",
        label: "Attendance",
        icon: Calendar1,
        roles: ["admin", "teacher"],
        color: "text-amber-600",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-500",
      },
      {
        to: "/app/fees",
        label: "Fees",
        icon: Bandage,
        roles: ["admin", "bursar"],
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-500",
      },
      {
        to: "/app/teachers",
        label: "Teachers",
        icon: Baby,
        roles: ["admin"],
        color: "text-pink-600",
        bgColor: "bg-pink-50",
        borderColor: "border-pink-500",
      },
      {
        to: "/app/subjects",
        label: "Subjects",
        icon: BookCopy,
        roles: ["admin"],
        color: "text-teal-600",
        bgColor: "bg-teal-50",
        borderColor: "border-teal-500",
      },
      {
        to: "/app/users",
        label: "Users",
        icon: Users,
        roles: ["admin"],
        color: "text-cyan-600",
        bgColor: "bg-cyan-50",
        borderColor: "border-cyan-500",
      },
      {
        to: "/app/guardians",
        label: "Guardians",
        icon: HandPlatter,
        roles: ["admin", "teacher"],
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-500",
      },
      {
        to: "/app/reports/debtors",
        label: "Debtors",
        icon: Flag,
        roles: ["admin", "bursar"],
        color: "text-rose-600",
        bgColor: "bg-rose-50",
        borderColor: "border-rose-500",
      },

      {
        to: "/app/reports/fees",
        label: "Fee Report",
        icon: FileText,
        roles: ["admin", "bursar"],
        color: "text-indigo-600",
        bgColor: "bg-indigo-50",
        borderColor: "border-indigo-500",
      },
      {
        to: "/app/exams/my",
        label: "My Subjects",
        icon: BookA,
        roles: ["teacher"],
        color: "text-violet-600",
        bgColor: "bg-violet-50",
        borderColor: "border-violet-500",
      },
      {
        to: "/app/exams/grades",
        label: "Grade Scheme",
        icon: Scale,
        roles: ["admin", "teacher"],
        color: "text-lime-600",
        bgColor: "bg-lime-50",
        borderColor: "border-lime-500",
      },
      {
        to: "/app/exams/results",
        label: "Results",
        icon: ChartColumn,
        roles: ["admin", "teacher"],
        color: "text-sky-600",
        bgColor: "bg-sky-50",
        borderColor: "border-sky-500",
      },
      {
        to: "/app/exams/report-card",
        label: "Report Card",
        icon: ClipboardPlus,
        roles: [],
        color: "text-fuchsia-600",
        bgColor: "bg-fuchsia-50",
        borderColor: "border-fuchsia-500",
      },
      {
        to: "/app/settings",
        label: "Settings",
        icon: Settings,
        roles: ["admin"],
        color: "text-indigo-600",
        bgColor: "bg-indigo-50",
        borderColor: "border-indigo-500",
      },
    ],
    [],
  );

  // Filter menu items based on user role
  const filteredMenu = useMemo(() => {
    if (!user) return [];
    return menuItems.filter((item) => {
      // If no roles specified, show to everyone
      if (item.roles.length === 0) return true;
      return item.roles.includes(user.role);
    });
  }, [user, menuItems]);

  // Collapse sidebar on small screens automatically
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
        setMobileMenuOpen(false);
      }
    };

    handleResize(); // Check on mount
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="fixed z-50 p-2 m-2 rounded-lg shadow-lg md:hidden bg-gradient-to-br from-blue-500 to-indigo-600"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Menu className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:relative z-40 flex flex-col h-full bg-gradient-to-b from-white to-gray-50 border-r border-gray-200
          transition-all duration-300 ease-in-out transform
          ${collapsed ? "w-20" : "w-64"}
          ${
            mobileMenuOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }
          shadow-xl md:shadow-lg
        `}
      >
        {/* Header with logo and toggle */}
        <div className="relative flex items-center justify-between h-20 px-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          {!collapsed && (
            <div className="flex items-center min-w-0 gap-3">
              <div className="p-2 shadow-lg rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                <GraduationCap className="text-white w-7 h-7" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold truncate text-slate-800">
                  Student Portal
                </h1>
                <p className="text-xs truncate text-slate-500">
                  School Management System
                </p>
              </div>
            </div>
          )}

          {collapsed && (
            <div className="p-2 mx-auto shadow-lg rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
              <GraduationCap className="text-white w-7 h-7" />
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`
              p-2 rounded-lg transition-all duration-200 hover:bg-white/50 hover:shadow-md
              ${
                collapsed
                  ? "absolute -right-3 top-1/2 -translate-y-1/2 bg-white shadow-lg"
                  : ""
              }
            `}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronRight
              size={18}
              className={`transition-transform duration-300 text-slate-600 ${
                collapsed ? "" : "rotate-180"
              }`}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {filteredMenu.map((item) => {
            const IconComponent = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/app"}
                className={({ isActive }) =>
                  `
                    flex items-center gap-3 px-3 py-3 rounded-xl
                    transition-all duration-200 group
                    ${
                      isActive
                        ? `${item.bgColor} ${item.color} font-semibold shadow-sm border-l-4 ${item.borderColor}`
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:shadow-sm"
                    }
                    ${collapsed ? "justify-center px-3" : ""}
                  `
                }
                title={collapsed ? item.label : undefined}
                onClick={() => setMobileMenuOpen(false)}
              >
                {({ isActive }) => (
                  <>
                    <div className="relative">
                      <IconComponent
                        size={22}
                        className={`shrink-0 transition-colors duration-200 ${
                          isActive
                            ? item.color
                            : "text-gray-500 group-hover:text-gray-700"
                        }`}
                      />
                      {isActive && !collapsed && (
                        <div className="absolute -right-1 -top-1">
                          <div className="w-2 h-2 bg-current rounded-full opacity-75 animate-ping" />
                          <div className="absolute w-2 h-2 bg-current rounded-full -right-1 -top-1" />
                        </div>
                      )}
                    </div>

                    {!collapsed && (
                      <>
                        <span className="flex-1 text-sm truncate">
                          {item.label}
                        </span>
                        {isActive && (
                          <ChevronRight
                            size={14}
                            className="ml-auto opacity-70 animate-pulse"
                          />
                        )}
                      </>
                    )}

                    {/* Tooltip for collapsed state */}
                    {collapsed && (
                      <div className="absolute z-50 px-2 py-1 ml-2 text-xs font-medium text-white transition-opacity duration-200 bg-gray-900 rounded opacity-0 left-full group-hover:opacity-100 whitespace-nowrap">
                        {item.label}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User info and logout */}
        {user && (
          <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-slate-50 to-blue-50/50">
            {!collapsed ? (
              <div className="flex items-center justify-between">
                {/* <div className="flex items-center min-w-0 gap-3">
                  <div className="relative">
                    <div className="flex items-center justify-center w-10 h-10 shadow-md rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                      <UserCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute w-4 h-4 border-2 border-white rounded-full -bottom-1 -right-1 bg-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate text-slate-800">
                      {user.name || "User"}
                    </p>
                    <p className="text-xs capitalize truncate text-slate-500">
                      {user.role}
                    </p>
                  </div>
                </div> */}
                {/* <button
                  onClick={() => {
                    // Handle logout here
                    localStorage.removeItem("token");
                    window.location.href = "/auth";
                  }}
                  className="p-2 text-gray-500 transition-colors rounded-lg hover:bg-red-50 hover:text-red-600"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button> */}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div className="flex items-center justify-center w-10 h-10 shadow-md rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                    <UserCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem("token");
                    window.location.href = "/auth";
                  }}
                  className="p-2 text-gray-500 transition-colors rounded-lg hover:bg-red-50 hover:text-red-600"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Collapsed hint */}
        {collapsed && !mobileMenuOpen && (
          <div className="p-3 text-center border-t border-gray-200">
            <div className="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold text-white rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
              {filteredMenu.length}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

export default function AppLayout() {
  return (
    <AppProvider>
      <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Sidebar />

        <div className="flex flex-col flex-1 min-w-0 md:ml-0">
          <Topbar />

          <main className="flex-1 min-h-0 p-4 overflow-y-auto md:p-6">
            {/* Decorative element */}
            <div className="absolute top-0 right-0 rounded-full -z-10 h-72 w-72 bg-gradient-to-br from-blue-100/30 to-indigo-100/20 blur-3xl" />

            <div className="relative w-full mx-auto max-w-7xl">
              {/* Optional breadcrumb can go here */}
              <Outlet />
            </div>
          </main>

          {/* Footer */}
          <footer className="px-4 py-3 border-t border-gray-200 bg-white/50 backdrop-blur-sm md:px-6">
            <div className="flex items-center justify-between mx-auto text-sm text-slate-600 max-w-7xl">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span>Student Portal v1.0</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="hidden md:inline">
                  © {new Date().getFullYear()} School Management System
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                  <Sparkles className="w-3 h-3" />
                  Connected
                </span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </AppProvider>
  );
}
