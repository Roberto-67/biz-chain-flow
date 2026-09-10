import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";


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

/* ---------------- store (backed by the database) ---------------- */

let chain: OrderBlock[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

type OrderRow = {
  block_index: number;
  order_id: string;
  customer: string;
  email: string | null;
  model_id: string;
  model_name: string;
  options: { label: string; price: number }[];
  subtotal: number;
  tax: number;
  delivery: number;
  total: number;
  delivery_address: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  delivery_eta_days: number | null;
  block_timestamp: number;
  nonce: number;
  previous_hash: string;
  hash: string;
};

function rowToBlock(r: OrderRow): OrderBlock {
  return {
    index: r.block_index,
    timestamp: Number(r.block_timestamp),
    orderId: r.order_id,
    customer: r.customer,
    modelId: r.model_id,
    modelName: r.model_name,
    options: (r.options ?? []) as { label: string; price: number }[],
    subtotal: r.subtotal,
    tax: r.tax,
    delivery: r.delivery,
    total: r.total,
    nonce: r.nonce,
    previousHash: r.previous_hash,
    hash: r.hash,
    ...(r.delivery_address ? { deliveryAddress: r.delivery_address } : {}),
    ...(r.delivery_lat != null ? { deliveryLat: r.delivery_lat } : {}),
    ...(r.delivery_lng != null ? { deliveryLng: r.delivery_lng } : {}),
    ...(r.delivery_eta_days != null ? { deliveryEtaDays: r.delivery_eta_days } : {}),
    ...(r.email ? { email: r.email } : {}),
  };
}

export async function refreshChain(): Promise<void> {
  if (typeof window === "undefined") return;
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("block_index", { ascending: true });
  if (error) throw error;
  chain = ((data ?? []) as unknown as OrderRow[]).map(rowToBlock);
  emit();
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  void refreshChain().catch(() => {
    /* offline / unreachable database — keep the empty chain */
  });
}

export function getLastHash(): string {
  return chain.length ? chain[chain.length - 1]!.hash : GENESIS_HASH;
}

export async function commitOrder(
  input: Omit<OrderBlock, "hash" | "nonce" | "index" | "previousHash" | "timestamp">,
): Promise<OrderBlock> {
  load();
  await refreshChain();

  const block = await mineBlock({
    ...input,
    index: chain.length,
    timestamp: Date.now(),
    previousHash: getLastHash(),
  });

  const { error } = await supabase.from("orders").insert({
    block_index: block.index,
    order_id: block.orderId,
    customer: block.customer,
    email: block.email ?? null,
    model_id: block.modelId,
    model_name: block.modelName,
    options: block.options,
    subtotal: block.subtotal,
    tax: block.tax,
    delivery: block.delivery,
    total: block.total,
    delivery_address: block.deliveryAddress ?? null,
    delivery_lat: block.deliveryLat ?? null,
    delivery_lng: block.deliveryLng ?? null,
    delivery_eta_days: block.deliveryEtaDays ?? null,
    block_timestamp: block.timestamp,
    nonce: block.nonce,
    previous_hash: block.previousHash,
    hash: block.hash,
  });
  if (error) throw new Error(`Could not save the order: ${error.message}`);

  await refreshChain();
  return block;
}

/** Local-only demo: alters a block in memory so verification fails. Reload to restore. */
export function tamperBlock(index: number, newTotal: number) {
  chain = chain.map((b) => (b.index === index ? { ...b, total: newTotal } : b));
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
    () => chain,
    () => EMPTY,
  );
}

export const GENESIS = GENESIS_HASH;
export const CHAIN_DIFFICULTY = DIFFICULTY;

