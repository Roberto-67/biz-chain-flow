import { Link } from "@tanstack/react-router";

const links = [
  { to: "/", label: "Configurator" },
  { to: "/erp", label: "ERP Dashboard" },
  { to: "/ledger", label: "Blockchain Ledger" },
  { to: "/records", label: "Sales Records" },
] as const;

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <span className="h-6 w-1.5 rounded-full bg-primary" />
          <span className="font-display text-lg font-extrabold uppercase tracking-[0.2em]">
            Nismo<span className="text-primary">Chain</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
