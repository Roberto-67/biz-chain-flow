import { useSyncExternalStore } from "react";

export type OrderBlock = {
  index: number;
  timestamp: number;
  orderId: string;
  customer: string;
  modelId: string;
  modelName: string;
  options: { label: string; price: number }[];
  subtotal: number;
  tax: number;
  delivery: number;
  total: number;
  nonce: number;
  previousHash: string;
  hash: string;
  deliveryAddress?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  deliveryEtaDays?: number;
  email?: string;
};

const STORAGE_KEY = "nismo-erp-chain-v1";
const GENESIS_HASH = "0".repeat(64);
const DIFFICULTY = 3; // leading zeros required

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function blockPayload(b: Omit<OrderBlock, "hash">): string {
  return JSON.stringify({
    index: b.index,
    timestamp: b.timestamp,
    orderId: b.orderId,
    customer: b.customer,
    modelId: b.modelId,
    options: b.options,
    total: b.total,
    nonce: b.nonce,
    previousHash: b.previousHash,
  });
}

export async function mineBlock(
  draft: Omit<OrderBlock, "hash" | "nonce">,
): Promise<OrderBlock> {
  const prefix = "0".repeat(DIFFICULTY);
  let nonce = 0;
  // Proof of work: bump the nonce until the digest starts with N zeros.
  for (;;) {
    const candidate = { ...draft, nonce };
    const hash = await sha256(blockPayload(candidate));
    if (hash.startsWith(prefix)) return { ...candidate, hash };
    nonce++;
  }
}

export async function verifyChain(chain: OrderBlock[]) {
  const results: { index: number; valid: boolean; reason?: string }[] = [];
  let previousHash = GENESIS_HASH;
  for (const block of chain) {
    const recomputed = await sha256(blockPayload(block));
    let reason: string | undefined;
    if (block.previousHash !== previousHash) reason = "Broken link to previous block";
    else if (recomputed !== block.hash) reason = "Hash does not match block contents";
    results.push({ index: block.index, valid: !reason, ...(reason ? { reason } : {}) });
    previousHash = block.hash;
  }
  return results;
}

/* ---------------- store ---------------- */

let chain: OrderBlock[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.add;
  for (const l of listeners) l();
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) chain = JSON.parse(raw) as OrderBlock[];
  } catch {
    chain = [];
  }
}

function persist() {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chain));
}

export function getLastHash(): string {
  load();
  return chain.length ? chain[chain.length - 1]!.hash : GENESIS_HASH;
}

export async function commitOrder(
  input: Omit<OrderBlock, "hash" | "nonce" | "index" | "previousHash" | "timestamp">,
): Promise<OrderBlock> {
  load();
  const block = await mineBlock({
    ...input,
    index: chain.length,
    timestamp: Date.now(),
    previousHash: getLastHash(),
  });
  chain = [...chain, block];
  persist();
  emit();
  return block;
}

export function tamperBlock(index: number, newTotal: number) {
  load();
  chain = chain.map((b) => (b.index === index ? { ...b, total: newTotal } : b));
  persist();
  emit();
}

export function resetChain() {
  chain = [];
  persist();
  emit();
}

function subscribe(cb: () => void) {
  load();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const EMPTY: OrderBlock[] = [];

export function useChain(): OrderBlock[] {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return chain;
    },
    () => EMPTY,
  );
}

export const GENESIS = GENESIS_HASH;
export const CHAIN_DIFFICULTY = DIFFICULTY;
