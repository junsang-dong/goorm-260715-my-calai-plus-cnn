import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/', label: '홈', end: true },
  { to: '/scan', label: '스캔' },
  { to: '/history', label: '기록' },
  { to: '/settings', label: '설정' },
]

export function AppShell() {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-border bg-bg-elevated/80 p-6 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="mb-10">
          <p className="font-display text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            My Cal AI Plus
          </p>
          <h1 className="font-display mt-2 text-xl font-semibold tracking-tight">
            Snap · Analyze · Coach
          </h1>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                [
                  'rounded-2xl px-4 py-3 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand/15 text-brand'
                    : 'text-muted hover:bg-surface hover:text-ink',
                ].join(' ')
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto text-xs text-muted">AI Native Fitness Coach</p>
      </aside>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-8 lg:pt-8">
        <header className="mb-5 flex items-end justify-between gap-3 lg:mb-8 lg:hidden">
          <div>
            <p className="font-display text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
              My Cal AI Plus
            </p>
            <h1 className="font-display mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              Snap · Analyze · Coach
            </h1>
          </div>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      {/* Mobile / tablet bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-bg-elevated/90 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-3xl justify-around px-2 py-3">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                [
                  'rounded-2xl px-4 py-2 text-sm font-medium transition sm:px-5',
                  isActive ? 'bg-brand/15 text-brand' : 'text-muted hover:text-ink',
                ].join(' ')
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
