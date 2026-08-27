import { createFileRoute, Link } from "@tanstack/react-router";
import { useChain } from "@/lib/chain";
import { MODELS, money } from "@/lib/nismo";

export const Route = createFileRoute("/erp")({
  head: () => ({
    meta: [
      { title: "ERP Dashboard — Income & Totals | NismoChain" },
      {
        name: "description",
        content:
          "Live ERP dashboard for the Nismo dealership: gross income, tax collected, delivery revenue, units sold and per-model performance from the hash-chained order ledger.",
      },
      { property: "og:title", content: "ERP Dashboard — Income & Totals | NismoChain" },
      {
        property: "og:description",
        content: "Gross income, tax, delivery revenue and per-model totals from the blockchain order ledger.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ErpPage,
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

function ErpPage() {
  const chain = useChain();

  const gross = chain.reduce((s, b) => s + b.total, 0);
  const net = chain.reduce((s, b) => s + b.subtotal, 0);
  const tax = chain.reduce((s, b) => s + b.tax, 0);
  const delivery = chain.reduce((s, b) => s + b.delivery, 0);
  const optionsRevenue = chain.reduce(
    (s, b) => s + b.options.reduce((o, opt) => o + opt.price, 0),
    0,
  );
  const avg = chain.length ? gross / chain.length : 0;

  const perModel = MODELS.map((m) => {
    const rows = chain.filter((b) => b.modelId === m.id);
    return {
      model: m,
      units: rows.length,
      income: rows.reduce((s, b) => s + b.total, 0),
    };
  }).sort((a, b) => b.income - a.income);

  const maxIncome = Math.max(1, ...perModel.map((p) => p.income));

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <p className="eyebrow">Enterprise resource planning</p>
      <h1 className="mt-2 text-4xl font-extrabold uppercase">Income & Totals</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Every figure below is derived from committed blocks in the order chain — no editable
        spreadsheet, no manual entry.
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Gross income" value={money(gross)} hint={`${chain.length} settled orders`} />
        <Stat label="Net revenue" value={money(net)} hint="Vehicles + options, pre-tax" />
        <Stat label="Tax collected" value={money(tax)} hint="12% VAT liability" />
        <Stat label="Average order" value={money(avg)} hint="Per committed block" />
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Options & packages" value={money(optionsRevenue)} hint="High-margin add-ons" />
        <Stat label="Delivery & logistics" value={money(delivery)} hint="Fixed per unit" />
        <Stat label="Units delivered" value={String(chain.length)} hint="Across all Nismo lines" />
      </section>

      <section className="mt-10 panel p-6">
        <h2 className="text-lg font-bold uppercase tracking-wide">Revenue by model</h2>
        <div className="mt-6 space-y-5">
          {perModel.map(({ model, units, income }) => (
            <div key={model.id}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold uppercase tracking-wide">{model.name}</span>
                <span className="text-muted-foreground">
                  {units} unit{units === 1 ? "" : "s"} · {money(income)}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${(income / maxIncome) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold uppercase tracking-wide">Order journal</h2>
          <Link to="/ledger" className="text-xs font-semibold uppercase tracking-widest text-primary">
            Inspect chain →
          </Link>
        </div>
        {chain.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            No orders committed yet.{" "}
            <Link to="/" className="text-primary underline-offset-4 hover:underline">
              Build a Nismo
            </Link>{" "}
            to write the first block.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-6 py-3 font-medium">Block</th>
                  <th className="px-6 py-3 font-medium">Order</th>
                  <th className="px-6 py-3 font-medium">Customer</th>
                  <th className="px-6 py-3 font-medium">Model</th>
                  <th className="px-6 py-3 text-right font-medium">Net</th>
                  <th className="px-6 py-3 text-right font-medium">Tax</th>
                  <th className="px-6 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {[...chain].reverse().map((b) => (
                  <tr key={b.hash} className="border-b border-border/60 last:border-0">
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">#{b.index}</td>
                    <td className="px-6 py-3 font-mono text-xs">{b.orderId}</td>
                    <td className="px-6 py-3">{b.customer}</td>
                    <td className="px-6 py-3 uppercase">{b.modelName}</td>
                    <td className="px-6 py-3 text-right">{money(b.subtotal)}</td>
                    <td className="px-6 py-3 text-right text-muted-foreground">{money(b.tax)}</td>
                    <td className="px-6 py-3 text-right font-semibold">{money(b.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
