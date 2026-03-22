import { useState, useCallback, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, ArrowLeftRight, BarChart3, Settings, Menu, X, ChevronDown, Wallet, Upload, CalendarDays } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

interface NavSectionConfig {
  label: string;
  items: NavItem[];
}

const navSections: NavSectionConfig[] = [
  {
    label: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Data',
    items: [
      { to: '/documents', icon: FileText, label: 'Documents' },
      { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
      { to: '/import', icon: Upload, label: 'Import' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { to: '/accounts', icon: Wallet, label: 'Accounts' },
      { to: '/bills', icon: CalendarDays, label: 'Bills' },
      { to: '/budgets', icon: BarChart3, label: 'Budgets' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/analysis', icon: BarChart3, label: 'Analysis' },
    ],
  },
];

const COLLAPSED_KEY = 'nav-collapsed-sections';

function getInitialCollapsed(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return {};
}

function NavSection({
  section,
  collapsed,
  onToggle,
}: {
  section: NavSectionConfig;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
        aria-expanded={!collapsed}
      >
        {section.label}
        <ChevronDown
          size={14}
          className={`transition-transform ${collapsed ? '-rotate-90' : ''}`}
        />
      </button>
      {!collapsed && (
        <ul className="mt-0.5 space-y-0.5">
          {section.items.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <Icon size={20} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(getInitialCollapsed);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Persist collapsed state
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsedSections));
    } catch {
      // ignore
    }
  }, [collapsedSections]);

  // Close on Escape
  useEffect(() => {
    if (!sidebarOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSidebarOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  // Focus trap inside sidebar when open
  useEffect(() => {
    if (!sidebarOpen || !sidebarRef.current) return;
    const sidebar = sidebarRef.current;
    const focusable = sidebar.querySelectorAll<HTMLElement>(
      'a, button, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length > 0) focusable[0].focus();

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab' || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [sidebarOpen]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const toggleSection = useCallback((label: string) => {
    setCollapsedSections((prev) => ({ ...prev, [label]: !prev[label] }));
  }, []);

  const navContent = (
    <>
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900">Assistant Home</h1>
      </div>
      <ul className="flex-1 px-3 space-y-3">
        {navSections.map((section) => (
          <NavSection
            key={section.label}
            section={section}
            collapsed={!!collapsedSections[section.label]}
            onToggle={() => toggleSection(section.label)}
          />
        ))}
      </ul>
      <div className="px-3 pb-4">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`
          }
        >
          <Settings size={20} />
          Settings
        </NavLink>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <nav className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col shrink-0">
        {navContent}
      </nav>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      <div
        ref={sidebarRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-4 right-4">
          <button
            onClick={closeSidebar}
            className="p-2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        {navContent}
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-600 hover:text-gray-900 min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Assistant Home</h1>
        </div>

        <main
          className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8"
          aria-hidden={sidebarOpen ? 'true' : undefined}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
