import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/',          icon: 'dashboard',    label: 'Dashboard' },
  { to: '/capacity',  icon: 'query_stats',  label: 'Projected Capacity' },
  { to: '/scenarios', icon: 'analytics',    label: 'Scenario Planning' },
]

export default function Sidebar() {
  return (
    <aside className="w-72 bg-plum flex flex-col h-screen fixed left-0 top-0 z-40">
      {/* Brand */}
      <div className="px-6 pt-6 pb-4 border-b border-white/10">
        <h1 className="text-2xl font-black text-white tracking-tighter lowercase">
          rippling
        </h1>
        <p className="text-[10px] font-bold text-[#C4A7B6] tracking-[0.15em] uppercase mt-1">
          Ops Headcount Planner
        </p>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/5 text-white'
                  : 'text-[#C4A7B6] hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gold rounded-r" />
                )}
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto p-4 border-t border-white/10 bg-black/10 space-y-2">
        <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-[#C4A7B6] hover:text-white transition-colors cursor-pointer">
          <span className="material-symbols-outlined text-[16px]">settings</span>
          Settings
        </button>
        <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-[#C4A7B6] hover:text-white transition-colors cursor-pointer">
          <span className="material-symbols-outlined text-[16px]">help</span>
          Support
        </button>
      </div>
    </aside>
  )
}
