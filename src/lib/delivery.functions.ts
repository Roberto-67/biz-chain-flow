import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

// Showroom origin: NISMO Manila delivery hub.
export const SHOWROOM = { name: "NISMO Manila Delivery Hub", lat: 14.5995, lng: 120.9842 };
export const SERVICE_RADIUS_KM = 700;

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export type DeliveryQuote = {
  formattedAddress: string;
  lat: number;
  lng: number;
  distanceKm: number;
  available: boolean;
  etaDays: number;
  message: string;
};

export const checkDelivery = createServerFn({ method: "POST" })
  .inputValidator((input: { address: string }) => {
    const address = (input?.address ?? "").trim();
    if (address.length < 3 || address.length > 200) throw new Error("Please enter a full delivery address.");
    return { address };
  })
  .handler(async ({ data }): Promise<DeliveryQuote> => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!lovableKey || !mapsKey) throw new Error("Map service is not configured yet.");

    const res = await fetch(
      `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(data.address)}`,
      {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": mapsKey,
        },
      },
    );

    if (res.status === 403) {
      const details: Array<{ reason?: string }> = ((await res.json()) as any)?.error?.details ?? [];
      const reason = details.find((d) => d.reason)?.reason;
      if (reason === "API_KEY_HTTP_REFERRER_BLOCKED")
        throw new Error(
          'Google Maps server key is referrer-restricted. In Google Cloud Console, set the server key\'s application restrictions to "None" or "IP addresses".',
        );
      if (reason === "API_KEY_SERVICE_BLOCKED")
        throw new Error(
          "Google Maps server key does not allow the Geocoding API. Add it to the server key's allowed-APIs list.",
        );
      throw new Error("Google Maps request was denied (403). Check the server key restrictions.");
    }

    if (!res.ok) {
      const body = await res.text();
      console.error(`Geocode failed [${res.status}]: ${body}`);
      throw new Error(`Address lookup failed [${res.status}].`);
    }

    const json = (await res.json()) as {
      status: string;
      results?: { formatted_address: string; geometry: { location: { lat: number; lng: number } } }[];
    };

    const first = json.results?.[0];
    if (json.status !== "OK" || !first) throw new Error("We could not find that address on the map.");

    const { lat, lng } = first.geometry.location;
    const distanceKm = Math.round(haversineKm(SHOWROOM.lat, SHOWROOM.lng, lat, lng));
    const available = distanceKm <= SERVICE_RADIUS_KM;
    const etaDays = available ? Math.max(3, Math.ceil(distanceKm / 180) + 2) : 0;

    return {
      formattedAddress: first.formatted_address,
      lat,
      lng,
      distanceKm,
      available,
      etaDays,
      message: available
        ? `Delivery available — ${distanceKm} km from ${SHOWROOM.name}, arriving in about ${etaDays} days.`
        : `Outside our ${SERVICE_RADIUS_KM} km delivery zone (${distanceKm} km away). Our team will arrange a freight quote.`,
    };
  });
