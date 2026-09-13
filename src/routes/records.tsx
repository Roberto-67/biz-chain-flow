import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { refreshChain, useChain, type OrderBlock } from "@/lib/chain";
import { money } from "@/lib/nismo";

export const Route = createFileRoute("/records")({
  head: () => ({
    meta: [
      { title: "Sales Records — Every Order Stored | NismoChain" },
      {
        name: "description",
        content:
          "Complete sales database for the Nismo dealership: total sold, revenue, tax and delivery, plus every stored order record with customer, options, delivery and hash details.",
      },
      { property: "og:title", content: "Sales Records — Every Order Stored | NismoChain" },
      {
        property: "og:description",
        content: "Total sales and the full record of every order saved in the database.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecordsPage,
});

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="panel p-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-3 font-display text-3xl font-extrabold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function toCsv(rows: OrderBlock[]): string {
  const head = [
    "block",
    "order_id",
    "date",
    "customer",
    "email",
    "model",
    "options",
    "subtotal",
    "tax",
    "delivery",
    "total",
    "delivery_address",
    "eta_days",
    "hash",
  ];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = rows.map((b) =>
    [
      b.index,
      b.orderId,
      new Date(b.timestamp).toISOString(),
      b.customer,
      b.email ?? "",
      b.modelName,
      b.options.map((o) => o.label).join(" | "),
      b.subtotal,
      b.tax,
      b.delivery,
      b.total,
      b.deliveryAddress ?? "",
      b.deliveryEtaDays ?? "",
      b.hash,
    ]
      .map(esc)
      .join(","),
  );
  return [head.join(","), ...lines].join("\n");
}

function RecordsPage() {
  const chain = useChain();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<number | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = [...chain].reverse();
    if (!q) return all;
    return all.filter((b) =>
      [b.orderId, b.customer, b.email ?? "", b.modelName, b.deliveryAddress ?? "", b.hash]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [chain, query]);

  const gross = chain.reduce((s, b) => s + b.total, 0);
  const net = chain.reduce((s, b) => s + b.subtotal, 0);
  const tax = chain.reduce((s, b) => s + b.tax, 0);
  const delivery = chain.reduce((s, b) => s + b.delivery, 0);
  const avg = chain.length ? gross / chain.length : 0;
  const best = [...chain].sort((a, b) => b.total - a.total)[0];

  function download() {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nismo-sales-records.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <p className="eyebrow">Database</p>
      <h1 className="mt-2 text-4xl font-extrabold uppercase">Sales Records</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Everything saved in the order database — how much you sold and the full detail of every
        purchase, including delivery and hash information.
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total sold" value={money(gross)} hint={`${chain.length} saved orders`} />
        <Stat label="Vehicles & options" value={money(net)} hint="Pre-tax revenue" />
        <Stat label="Tax collected" value={money(tax)} hint="12% VAT" />
        <Stat label="Delivery charged" value={money(delivery)} hint="Logistics income" />
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2">
        <Stat label="Average sale" value={money(avg)} hint="Per saved order" />
        <Stat
          label="Largest sale"
          value={best ? money(best.total) : money(0)}
          hint={best ? `${best.modelName} · ${best.customer}` : "No sales yet"}
        />
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search order, customer, email, model, address…"
          className="min-w-64 flex-1 rounded-md border border-border bg-background/60 px-4 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={() => void refreshChain()}
          className="rounded-md border border-border px-3 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          Refresh
        </button>
        <button
          onClick={download}
          disabled={rows.length === 0}
          className="rounded-md border border-primary/60 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-primary transition-opacity hover:opacity-80 disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      <section className="mt-6 panel overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">
            {chain.length === 0 ? (
              <>
                No purchases recorded yet.{" "}
                <Link to="/" className="text-primary underline-offset-4 hover:underline">
                  Place an order
                </Link>{" "}
                to create the first record.
              </>
            ) : (
              "No records match your search."
            )}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Order</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Model</th>
                  <th className="px-5 py-3 text-right font-medium">Total</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <Fragment key={b.hash}>
                    <tr className="border-b border-border/60">
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {new Date(b.timestamp).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">{b.orderId}</td>
                      <td className="px-5 py-3">
                        {b.customer}
                        {b.email ? (
                          <span className="block text-xs text-muted-foreground">{b.email}</span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 uppercase">{b.modelName}</td>
                      <td className="px-5 py-3 text-right font-semibold">{money(b.total)}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setOpen(open === b.index ? null : b.index)}
                          className="text-xs font-semibold uppercase tracking-widest text-primary"
                        >
                          {open === b.index ? "Hide" : "Details"}
                        </button>
                      </td>
                    </tr>
                    {open === b.index && (
                      <tr className="border-b border-border/60 bg-background/50">
                        <td colSpan={6} className="px-5 py-5">
                          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <dt className="eyebrow">Options</dt>
                              <dd>
                                {b.options.length
                                  ? b.options.map((o) => `${o.label} (${money(o.price)})`).join(", ")
                                  : "None"}
                              </dd>
                            </div>
                            <div>
                              <dt className="eyebrow">Breakdown</dt>
                              <dd>
                                Net {money(b.subtotal)} · Tax {money(b.tax)} · Delivery{" "}
                                {money(b.delivery)}
                              </dd>
                            </div>
                            <div>
                              <dt className="eyebrow">Delivery</dt>
                              <dd>
                                {b.deliveryAddress ?? "Not provided"}
                                {b.deliveryEtaDays != null ? ` · ETA ${b.deliveryEtaDays} days` : ""}
                              </dd>
                            </div>
                            <div className="sm:col-span-2 lg:col-span-3">
                              <dt className="eyebrow">Block #{b.index} hash · nonce {b.nonce.toLocaleString()}</dt>
                              <dd className="hash-text text-primary">{b.hash}</dd>
                            </div>
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
