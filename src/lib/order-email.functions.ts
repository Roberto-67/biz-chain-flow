import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

const b64 = (s: string) =>
  btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
const header = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Input = {
  to: string;
  customer: string;
  orderId: string;
  modelName: string;
  options: { label: string; price: number }[];
  total: number;
  hash: string;
  blockIndex: number;
  deliveryAddress: string;
  etaDays: number;
};

export const sendOrderConfirmation = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => {
    const to = (input?.to ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error("Please enter a valid email address.");
    if (!input.orderId || !input.modelName) throw new Error("Order details are incomplete.");
    return { ...input, to };
  })
  .handler(async ({ data }) => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const gmailKey = process.env["GOOGLE_MAIL_API_KEY"];
    if (!lovableKey || !gmailKey) throw new Error("Email service is not configured yet.");

    const money = (n: number) =>
      n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

    const rows = data.options
      .map(
        (o) =>
          `<tr><td style="padding:6px 0;color:#555">${esc(o.label)}</td><td align="right">${
            o.price === 0 ? "Included" : money(o.price)
          }</td></tr>`,
      )
      .join("");

    const html = `<!doctype html><html><body style="background:#ffffff;font-family:Arial,sans-serif;color:#111">
<div style="max-width:600px;margin:0 auto;padding:24px">
<p style="letter-spacing:.2em;font-size:11px;color:#c3002f;font-weight:bold;margin:0">NISMO ORDER DESK</p>
<h1 style="font-size:24px;margin:8px 0 4px">Order is confirmed</h1>
<p style="color:#111;font-size:15px;margin:0">Your ${esc(data.modelName)} order is confirmed.</p>
<p style="color:#555">Hi ${esc(data.customer)}, your order <strong>${esc(data.orderId)}</strong> has been recorded and is being prepared.</p>
<table width="100%" style="border-collapse:collapse;font-size:14px;margin-top:16px">${rows}
<tr><td style="padding:10px 0;border-top:1px solid #eee"><strong>Total</strong></td><td align="right" style="padding:10px 0;border-top:1px solid #eee"><strong>${money(
      data.total,
    )}</strong></td></tr></table>
<p style="font-size:14px;margin-top:16px"><strong>Delivery to:</strong><br>${esc(data.deliveryAddress)}<br>
Estimated arrival in about ${data.etaDays} days.</p>
<p style="font-size:12px;color:#777;margin-top:20px">Ledger block #${data.blockIndex}<br>
<span style="font-family:monospace;word-break:break-all">${esc(data.hash)}</span></p>
</div></body></html>`;

    const message = [
      `To: ${data.to}`,
      `Subject: ${header(`Order is confirmed — ${data.modelName} (${data.orderId})`)}`,
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="UTF-8"',
      "",
      html,
    ].join("\r\n");

    const raw = b64(message).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const res = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gmailKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Gmail send failed [${res.status}]: ${body}`);
      throw new Error(`Confirmation email could not be sent [${res.status}].`);
    }

    return { sent: true as const };
  });
