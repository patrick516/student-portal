import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/app/state/useApp";
import { api } from "@/api/client";
import { Input } from "@/components/ui/input";
import { Search, Menu, LogOut, GraduationCap, ChevronDown } from "lucide-react";

type FormClass = {
  id: string;
  name: string;
  stream?: string | null;
  year?: number | null;
};

export default function Topbar() {
  const { user, classes, selectedClassId, setSelectedClassId } = useApp();
  const [, setFormClasses] = useState<FormClass[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadFormClasses = async () => {
      if (!user) return;
      if (!(user.role === "teacher" || user.role === "admin")) {
        setFormClasses([]);
        return;
      }
      try {
        const { data } = await api.get("/api/classes/my-form");
        setFormClasses(data.data || []);
      } catch {
        setFormClasses([]);
      }
    };
    loadFormClasses();
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/auth", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b shadow-sm backdrop-blur-xl bg-white/90 border-slate-200/60">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* LEFT: Logo/Brand + Search + Class Selector */}
        <div className="flex items-center flex-1 gap-4">
          {/* Menu Button with modern styling */}
          <button className="flex items-center justify-center w-10 h-10 transition-all duration-200 shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl shadow-indigo-200/50 hover:shadow-xl group">
            <Menu className="w-5 h-5 text-white transition-transform group-hover:scale-110" />
          </button>

          {/* Brand/Logo Area */}
          <div className="items-center hidden gap-2 md:flex">
            <div className="flex items-center justify-center rounded-lg shadow-md bg-gradient-to-br from-indigo-500 to-purple-600 h-9 w-9">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-transparent bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text">
              Student Portal
            </span>
          </div>

          {/* Search + Class Selector (hidden on very small screens) */}
          <div className="items-center flex-1 hidden gap-3 ml-6 md:flex">
            {/* Search Input */}
            <div className="relative w-full max-w-md">
              <Search className="absolute w-4 h-4 text-slate-400 -translate-y-1/2 pointer-events-none left-3.5 top-1/2" />
              <Input
                placeholder="Search students, classes, subjects..."
                className="w-full h-10 pl-10 pr-4 text-sm transition-all border bg-slate-50/50 border-slate-200 rounded-xl focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
              />
            </div>

            {/* Class Selector */}
            <div className="relative hidden lg:block">
              <ChevronDown className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none text-slate-400 right-3 top-1/2" />
              <select
                value={selectedClassId || ""}
                onChange={(e) => setSelectedClassId(e.target.value || null)}
                className="h-10 pl-4 pr-10 text-sm font-medium transition-all border appearance-none cursor-pointer bg-slate-50/50 border-slate-200 rounded-xl text-slate-700 hover:bg-white hover:border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 min-w-[180px]"
              >
                {classes.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                    {k.stream ? ` ${k.stream}` : ""}
                    {k.year ? ` • ${k.year}` : ""}
                  </option>
                ))}
                {!classes.length && <option value="">No classes</option>}
              </select>
            </div>
          </div>
        </div>

        {/* RIGHT: User Profile + Logout */}
        <div className="flex items-center gap-3">
          {/* User Profile */}
          <div className="flex items-center gap-3 px-3 py-2 transition-all border rounded-xl border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-200">
            <div className="flex items-center justify-center text-sm font-bold text-white rounded-full shadow-md bg-gradient-to-br from-indigo-500 to-purple-600 h-9 w-9 ring-2 ring-white">
              {user?.name ? user.name[0]?.toUpperCase() : "A"}
            </div>
            <div className="hidden text-sm leading-tight sm:block">
              <div className="font-semibold text-slate-800">
                {user?.name || "Admin"}
              </div>
              <div className="text-xs font-medium capitalize text-slate-500">
                {user?.role || "role"}
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-all shadow-lg rounded-xl bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-red-200/50 hover:shadow-xl group"
          >
            <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile: Search + Class Selector */}
      <div className="flex flex-col gap-3 px-4 pb-4 border-t md:hidden border-slate-100 bg-slate-50/30">
        {/* Mobile Search */}
        <div className="relative w-full">
          <Search className="absolute w-4 h-4 text-slate-400 -translate-y-1/2 pointer-events-none left-3.5 top-1/2" />
          <Input
            placeholder="Search..."
            className="w-full h-10 pl-10 pr-4 text-sm transition-all bg-white border border-slate-200 rounded-xl focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Mobile Class Selector */}
        <div className="relative">
          <ChevronDown className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none text-slate-400 right-3 top-1/2" />
          <select
            value={selectedClassId || ""}
            onChange={(e) => setSelectedClassId(e.target.value || null)}
            className="w-full h-10 pl-4 pr-10 text-sm font-medium transition-all bg-white border appearance-none cursor-pointer border-slate-200 rounded-xl text-slate-700 hover:border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
          >
            {classes.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
                {k.stream ? ` ${k.stream}` : ""}
                {k.year ? ` • ${k.year}` : ""}
              </option>
            ))}
            {!classes.length && <option value="">No classes</option>}
          </select>
        </div>
      </div>
    </header>
  );
}
