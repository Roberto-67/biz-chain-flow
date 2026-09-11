import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  DELIVERY_FEE,
  INTERIORS,
  MODELS,
  PACKAGES,
  PAINTS,
  TAX_RATE,
  WHEELS,
  money,
  type Option,
} from "@/lib/nismo";
import { commitOrder, type OrderBlock } from "@/lib/chain";
import { useServerFn } from "@tanstack/react-start";
import {
  checkDelivery,
  SERVICE_AREA,
  SHOWROOM,
  type DeliveryQuote,
} from "@/lib/delivery.functions";
import { sendOrderConfirmation } from "@/lib/order-email.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Build Your Nissan NISMO — Configurator & Blockchain Order Desk" },
      {
        name: "description",
        content:
          "Configure a Nissan NISMO: pick the model, paint, forged wheels, interior and track packages, then commit the order to a SHA-256 hash-chained ERP ledger.",
      },
      { property: "og:title", content: "Build Your Nissan NISMO — Blockchain Order Desk" },
      {
        property: "og:description",
        content:
          "Pick your NISMO, price every option live, and settle the order into a tamper-evident block.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Configurator,
});

function OptionRow({
  option,
  selected,
  onSelect,
  multi,
}: {
  option: Option;
  selected: boolean;
  onSelect: () => void;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between gap-4 rounded-md border px-4 py-3 text-left transition-colors ${
        selected
          ? "border-primary bg-primary/10"
          : "border-border bg-background/40 hover:border-muted-foreground/50"
      }`}
    >
      <span>
        <span className="block text-sm font-semibold">{option.label}</span>
        {option.note ? (
          <span className="block text-xs text-muted-foreground">{option.note}</span>
        ) : null}
      </span>
      <span className="flex items-center gap-3 whitespace-nowrap text-sm text-muted-foreground">
        {option.price === 0 ? "Included" : `+ ${money(option.price)}`}
        <span
          className={`inline-block h-4 w-4 border ${multi ? "rounded-[3px]" : "rounded-full"} ${
            selected ? "border-primary bg-primary" : "border-muted-foreground/60"
          }`}
        />
      </span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel p-6">
      <h2 className="text-sm font-bold uppercase tracking-[0.2em]">{title}</h2>
      <div className="mt-4 space-y-2">{children}</div>
    </section>
  );
}

function Configurator() {
  const [modelId, setModelId] = useState(MODELS[0]!.id);
  const [paint, setPaint] = useState(PAINTS[0]!.id);
  const [wheel, setWheel] = useState(WHEELS[0]!.id);
  const [interior, setInterior] = useState(INTERIORS[0]!.id);
  const [packages, setPackages] = useState<string[]>([]);
  const [customer, setCustomer] = useState("");
  const [mining, setMining] = useState(false);
  const [receipt, setReceipt] = useState<OrderBlock | null>(null);
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  const runCheckDelivery = useServerFn(checkDelivery);
  const runSendEmail = useServerFn(sendOrderConfirmation);

  const mapsKey = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as
    | string
    | undefined;

  async function locate() {
    if (checking) return;
    setChecking(true);
    setError(null);
    setQuote(null);
    try {
      setQuote(await runCheckDelivery({ data: { address } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Address lookup failed.");
    } finally {
      setChecking(false);
    }
  }

  const model = MODELS.find((m) => m.id === modelId)!;

  const chosen = useMemo<Option[]>(
    () => [
      PAINTS.find((o) => o.id === paint)!,
      WHEELS.find((o) => o.id === wheel)!,
      INTERIORS.find((o) => o.id === interior)!,
      ...PACKAGES.filter((p) => packages.includes(p.id)),
    ],
    [paint, wheel, interior, packages],
  );

  const optionsTotal = chosen.reduce((s, o) => s + o.price, 0);
  const subtotal = model.base + optionsTotal;
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax + DELIVERY_FEE;

  const togglePackage = (id: string) =>
    setPackages((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function placeOrder() {
    if (mining) return;
    if (!quote?.available) {
      setError("Confirm a delivery location inside the service zone first.");
      return;
    }
    setMining(true);
    setReceipt(null);
    setError(null);
    setEmailStatus(null);
    try {
      const block = await commitOrder({
        orderId: `NSM-${Date.now().toString(36).toUpperCase()}`,
        customer: customer.trim() || "Walk-in client",
        modelId: model.id,
        modelName: model.name,
        options: chosen.map((o) => ({ label: o.label, price: o.price })),
        subtotal,
        tax,
        delivery: DELIVERY_FEE,
        total,
        deliveryAddress: quote.formattedAddress,
        deliveryLat: quote.lat,
        deliveryLng: quote.lng,
        deliveryEtaDays: quote.etaDays,
        ...(email.trim() ? { email: email.trim() } : {}),
      });
      setReceipt(block);

      if (email.trim()) {
        setEmailStatus("Sending confirmation…");
        try {
          await runSendEmail({
            data: {
              to: email.trim(),
              customer: customer.trim() || "there",
              orderId: block.orderId,
              modelName: block.modelName,
              options: block.options,
              total: block.total,
              hash: block.hash,
              blockIndex: block.index,
              deliveryAddress: quote.formattedAddress,
              etaDays: quote.etaDays,
            },
          });
          setEmailStatus(`Confirmation sent to ${email.trim()}`);
        } catch (e) {
          setEmailStatus(e instanceof Error ? e.message : "Confirmation email failed.");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the order. Please try again.");
    } finally {
      setMining(false);
    }
  }

  return (
    <main>
      <section className="relative overflow-hidden border-b border-border">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <p className="eyebrow">Step 01 — Choose your machine</p>
            <h1 className="mt-3 text-5xl font-extrabold uppercase leading-[0.95]">
              {model.name}
            </h1>
            <p className="mt-3 text-muted-foreground">{model.tagline}</p>
            <img
              src={model.image}
              alt={`${model.name} in studio lighting`}
              width={1600}
              height={912}
              className="mt-6 w-full rounded-lg"
            />
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["Power", model.power],
                ["0–100 km/h", model.zeroToSixty],
                ["Top speed", model.topSpeed],
                ["Drivetrain", model.drivetrain],
              ].map(([k, v]) => (
                <div key={k} className="border-l-2 border-primary pl-3">
                  <p className="eyebrow">{k}</p>
                  <p className="mt-1 font-display text-lg font-bold">{v}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => setModelId(m.id)}
                className={`flex w-full items-center gap-4 rounded-lg border p-3 text-left transition-colors ${
                  m.id === modelId
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card/60 hover:border-muted-foreground/50"
                }`}
              >
                <img
                  src={m.image}
                  alt={m.name}
                  loading="lazy"
                  width={1600}
                  height={912}
                  className="h-16 w-28 rounded object-cover"
                />
                <span className="flex-1">
                  <span className="block font-display text-sm font-bold uppercase tracking-wide">
                    {m.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">From {money(m.base)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-12 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="space-y-6">
          <Section title="Step 02 — Exterior paint">
            {PAINTS.map((o) => (
              <OptionRow key={o.id} option={o} selected={paint === o.id} onSelect={() => setPaint(o.id)} />
            ))}
          </Section>
          <Section title="Step 03 — Forged wheels">
            {WHEELS.map((o) => (
              <OptionRow key={o.id} option={o} selected={wheel === o.id} onSelect={() => setWheel(o.id)} />
            ))}
          </Section>
          <Section title="Step 04 — Interior">
            {INTERIORS.map((o) => (
              <OptionRow
                key={o.id}
                option={o}
                selected={interior === o.id}
                onSelect={() => setInterior(o.id)}
              />
            ))}
          </Section>
          <Section title="Step 05 — Performance packages">
            {PACKAGES.map((o) => (
              <OptionRow
                key={o.id}
                option={o}
                multi
                selected={packages.includes(o.id)}
                onSelect={() => togglePackage(o.id)}
              />
            ))}
          </Section>

          <Section title="Step 06 — Delivery location">
            <p className="text-sm text-muted-foreground">
              Enter where the car should be sent. We deliver anywhere in {SERVICE_AREA}, shipped
              from {SHOWROOM.name}.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void locate();
                }}
                placeholder="e.g. 123 Ayala Ave, Makati, Metro Manila"
                className="flex-1 rounded-md border border-input bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => void locate()}
                disabled={checking || address.trim().length < 3}
                className="rounded-md border border-primary px-4 py-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-primary disabled:opacity-50"
              >
                {checking ? "Checking…" : "Check address"}
              </button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {quote && (
              <div
                className={`rounded-md border p-4 ${
                  quote.available ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10"
                }`}
              >
                <p className="text-sm font-semibold">{quote.formattedAddress}</p>
                <p className="mt-1 text-sm text-muted-foreground">{quote.message}</p>
                {mapsKey && (
                  <iframe
                    title="Delivery location map"
                    loading="lazy"
                    className="mt-3 h-64 w-full rounded-md border border-border"
                    src={`https://www.google.com/maps/embed/v1/view?key=${mapsKey}&center=${quote.lat},${quote.lng}&zoom=13`}
                  />
                )}
              </div>
            )}
          </Section>
        </div>

        <aside className="panel sticky top-24 p-6">
          <p className="eyebrow">Your build</p>
          <h2 className="mt-2 text-2xl font-extrabold uppercase">{model.name}</h2>

          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Base vehicle</dt>
              <dd>{money(model.base)}</dd>
            </div>
            {chosen
              .filter((o) => o.price > 0)
              .map((o) => (
                <div key={o.id} className="flex justify-between">
                  <dt className="text-muted-foreground">{o.label}</dt>
                  <dd>{money(o.price)}</dd>
                </div>
              ))}
            <div className="flex justify-between border-t border-border pt-2">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{money(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">VAT (12%)</dt>
              <dd>{money(tax)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery</dt>
              <dd>{money(DELIVERY_FEE)}</dd>
            </div>
          </dl>

          <div className="mt-5 flex items-baseline justify-between border-t border-border pt-4">
            <span className="eyebrow">Total</span>
            <span className="font-display text-3xl font-extrabold">{money(total)}</span>
          </div>

          <label className="mt-5 block">
            <span className="eyebrow">Client name</span>
            <input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="e.g. R. Alejandro"
              className="mt-2 w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>

          <label className="mt-4 block">
            <span className="eyebrow">Email for confirmation</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="buyer@email.com"
              className="mt-2 w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>

          <div className="mt-4 rounded-md border border-border bg-background/40 p-3 text-xs">
            <p className="eyebrow">Delivery</p>
            <p className="mt-1 text-muted-foreground">
              {quote
                ? quote.available
                  ? `${quote.formattedAddress} · ~${quote.etaDays} days`
                  : `${quote.formattedAddress} · outside the Philippines`
                : "Check a delivery address in Step 06 to continue."}
            </p>
          </div>

          <button
            onClick={placeOrder}
            disabled={mining || !quote?.available}
            className="mt-4 w-full rounded-md bg-primary px-4 py-3 font-display text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {mining ? "Mining block…" : "Place order & mine block"}
          </button>

          {!quote?.available && !mining && (
            <p className="mt-2 text-xs text-muted-foreground">
              {quote
                ? "That address isn't in the Philippines — try a local address in Step 06."
                : "Enter your delivery address in Step 06 and tap “Check address” to unlock ordering."}
            </p>
          )}

          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}


          {receipt && (
            <div className="mt-5 rounded-md border border-success/40 bg-success/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-success">
                Block #{receipt.index} committed
              </p>
              <p className="mt-2 hash-text text-foreground">{receipt.hash}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Nonce {receipt.nonce.toLocaleString()} · {receipt.orderId}
              </p>
              {receipt.deliveryAddress && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Shipping to {receipt.deliveryAddress}
                </p>
              )}
              {emailStatus && <p className="mt-2 text-xs text-foreground">{emailStatus}</p>}
              <div className="mt-3 flex gap-4 text-xs font-semibold uppercase tracking-widest">
                <Link to="/erp" className="text-primary">
                  View income →
                </Link>
                <Link to="/ledger" className="text-primary">
                  View ledger →
                </Link>
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
