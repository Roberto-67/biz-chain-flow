import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CHAIN_DIFFICULTY,
  GENESIS,
  clearChain,
  refreshChain,
  tamperBlock,
  useChain,
  verifyChain,
} from "@/lib/chain";
import { money } from "@/lib/nismo";

export const Route = createFileRoute("/ledger")({
  head: () => ({
    meta: [
      { title: "Blockchain Ledger — Order Hash Chain | NismoChain" },
      {
        name: "description",
        content:
          "Inspect every Nismo order as a mined block: SHA-256 hash, previous hash link, nonce and proof-of-work, with one-click chain integrity verification.",
      },
      { property: "og:title", content: "Blockchain Ledger — Order Hash Chain | NismoChain" },
      {
        property: "og:description",
        content: "SHA-256 hashed, proof-of-work order blocks with live tamper detection.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LedgerPage,
});

function LedgerPage() {
  const chain = useChain();
  const [results, setResults] = useState<{ index: number; valid: boolean; reason?: string }[]>([]);
  const [checking, setChecking] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setChecking(true);
    verifyChain(chain).then((r) => {
      if (alive) {
        setResults(r);
        setChecking(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [chain]);

  const broken = results.filter((r) => !r.valid).length;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <p className="eyebrow">Distributed order ledger</p>
      <h1 className="mt-2 text-4xl font-extrabold uppercase">Blockchain</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Each confirmed order is mined into a block with SHA-256 proof-of-work (difficulty{" "}
        {CHAIN_DIFFICULTY} leading zeros) and linked to the hash of the block before it.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-widest ${
            broken
              ? "border-destructive/50 bg-destructive/15 text-destructive"
              : "border-border bg-secondary text-success"
          }`}
        >
          {checking ? "Verifying…" : broken ? `${broken} invalid block(s)` : "Chain valid"}
        </span>
        <span className="text-xs text-muted-foreground">{chain.length} blocks</span>
        <button
          onClick={() => void refreshChain()}
          className="ml-auto rounded-md border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          Refresh from database
        </button>
        <button
          onClick={() => {
            if (clearing || chain.length === 0) return;
            if (!window.confirm("Delete every order block permanently? This cannot be undone.")) return;
            setClearing(true);
            setClearError(null);
            clearChain()
              .catch((e: unknown) =>
                setClearError(e instanceof Error ? e.message : "Could not clear the ledger."),
              )
              .finally(() => setClearing(false));
          }}
          disabled={clearing || chain.length === 0}
          className="rounded-md border border-destructive/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-destructive transition-opacity hover:opacity-80 disabled:opacity-40"
        >
          {clearing ? "Clearing…" : "Clear database"}
        </button>
      </div>

      {clearError && <p className="mt-3 text-sm text-destructive">{clearError}</p>}

      <div className="mt-8 space-y-4">
        {chain.length === 0 && (
          <div className="panel p-10 text-center text-sm text-muted-foreground">
            Genesis only. <span className="hash-text">{GENESIS.slice(0, 32)}…</span>
            <div className="mt-4">
              <Link to="/" className="text-primary underline-offset-4 hover:underline">
                Configure a Nismo to mine block #0
              </Link>
            </div>
          </div>
        )}

        {[...chain].reverse().map((b) => {
          const status = results.find((r) => r.index === b.index);
          const invalid = status && !status.valid;
          return (
            <article
              key={b.index}
              className={`panel p-6 ${invalid ? "border-destructive/60" : ""}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl font-extrabold uppercase">
                  Block #{b.index}
                  <span className="ml-3 text-xs font-semibold tracking-widest text-muted-foreground">
                    {new Date(b.timestamp).toLocaleString()}
                  </span>
                </h2>
                <span
                  className={`text-xs font-semibold uppercase tracking-widest ${
                    invalid ? "text-destructive" : "text-success"
                  }`}
                >
                  {invalid ? status?.reason : "Verified"}
                </span>
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="eyebrow">Order</dt>
                  <dd className="font-mono text-xs">{b.orderId}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Customer</dt>
                  <dd>{b.customer}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Vehicle</dt>
                  <dd className="uppercase">{b.modelName}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Total</dt>
                  <dd className="font-semibold">{money(b.total)}</dd>
                </div>
              </dl>

              <div className="mt-4 space-y-2 rounded-md bg-background/60 p-4">
                <div>
                  <p className="eyebrow">Previous hash</p>
                  <p className="hash-text">{b.previousHash}</p>
                </div>
                <div>
                  <p className="eyebrow">Hash · nonce {b.nonce.toLocaleString()}</p>
                  <p className="hash-text text-primary">{b.hash}</p>
                </div>
              </div>

              <button
                onClick={() => tamperBlock(b.index, b.total + 10000)}
                className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground underline-offset-4 hover:text-destructive hover:underline"
              >
                Simulate tampering (+$10,000)
              </button>
            </article>
          );
        })}
      </div>
    </main>
  );
}
