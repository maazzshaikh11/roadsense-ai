import { Activity, AlertTriangle, BarChart3, Home, Info, Map as MapIcon, Menu, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { api } from "../services/api";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/dashboard", label: "Dashboard", icon: Activity },
  { to: "/map", label: "Risk Map", icon: MapIcon },
  { to: "/assess", label: "Risk Assessment", icon: ShieldAlert },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/model", label: "Model", icon: Info },
  { to: "/about", label: "About & Data", icon: Info },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
              isActive ? "bg-teal-400/15 text-teal-200" : "text-muted hover:bg-white/5 hover:text-ink"
            }`
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { data: health, error: healthError } = useApi(() => api.health(), []);

  return (
    <div className="flex min-h-screen bg-navy-950">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/10 bg-navy-900 p-4 md:flex">
        <Link to="/" className="flex items-center gap-2 px-2 py-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-400/15 text-lg font-bold text-teal-300">R</span>
          <span className="leading-tight">
            <span className="block font-semibold">RoadSense AI</span>
            <span className="block text-xs text-muted">Accident Risk Mapping</span>
          </span>
        </Link>
        <nav className="mt-6 space-y-1">
          <NavItems />
        </nav>
        <div className="mt-auto rounded-xl border border-white/10 p-3 text-xs leading-relaxed text-muted">
          <p className="font-medium text-ink">Data status</p>
          {health ? (
            <>
              <p>Processed data: {health.data_available ? "available" : "not loaded"}</p>
              <p>Model: {health.model_available ? "trained" : "not trained"}</p>
            </>
          ) : (
            <p>Backend status unknown — is FastAPI running on port 8000?</p>
          )}
          <p className="mt-2">Historical data only. No live traffic or weather is claimed.</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-navy-950/90 px-4 py-3 backdrop-blur md:hidden">
          <Link to="/" className="font-semibold">RoadSense AI</Link>
          <button onClick={() => setOpen((v) => !v)} aria-label="Toggle navigation" className="rounded-lg border border-white/10 p-2">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>
        {open && (
          <nav className="space-y-1 border-b border-white/10 bg-navy-900 p-4 md:hidden">
            <NavItems onNavigate={() => setOpen(false)} />
          </nav>
        )}

        {/* Backend-unreachable banner (only when health fetch failed outright) */}
        {healthError && (
          <div className="hidden items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200 md:flex">
            <AlertTriangle className="h-4 w-4" />
            Backend status could not be confirmed. Pages will show their setup state if the API is unavailable.
          </div>
        )}

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          <Outlet />
        </main>
        <footer className="border-t border-white/10 px-4 py-4 text-center text-xs text-muted">
          RoadSense AI — academic project. Dataset: US Accidents (2016–2023) by Sobhan Moosavi, CC BY-NC-SA 4.0, via Kaggle.
          Historical hotspot scores are not future-crash probabilities.
        </footer>
      </div>
    </div>
  );
}
