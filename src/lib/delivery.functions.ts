import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

// Showroom origin: NISMO Manila delivery hub.
export const SHOWROOM = { name: "NISMO Manila Delivery Hub", lat: 14.5995, lng: 120.9842 };
// Nationwide delivery: anywhere in the Philippines.
export const SERVICE_AREA = "the Philippines";

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
  /** Google place identifier, used to open the exact pin in Google Maps. */
  placeId?: string | undefined;
  /** How exact the pin is: exact rooftop/street entrance, street level, or area only. */
  precision: "exact" | "street" | "approximate";
  precisionNote: string;
};

function credentials() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !mapsKey) {
    throw new Error(
      "Map lookup is not configured. Set LOVABLE_API_KEY and GOOGLE_MAPS_API_KEY in your .env file (see .env.example) and restart the dev server.",
    );
  }
  return { lovableKey, mapsKey };
}

function throwOn403(status: number, payload: unknown): never | void {
  if (status !== 403) return;
  const details: Array<{ reason?: string }> = (payload as any)?.error?.details ?? [];
  const reason = details.find((d) => d.reason)?.reason;
  if (reason === "API_KEY_HTTP_REFERRER_BLOCKED")
    throw new Error(
      'Google Maps server key is referrer-restricted. In Google Cloud Console, set the server key\'s application restrictions to "None" or "IP addresses".',
    );
  if (reason === "API_KEY_SERVICE_BLOCKED")
    throw new Error(
      "Google Maps server key does not allow this API. Add the Places API (New) and Geocoding API to the server key's allowed-APIs list.",
    );
  throw new Error("Google Maps request was denied (403). Check the server key restrictions.");
}

type Located = {
  formattedAddress: string;
  lat: number;
  lng: number;
  placeId?: string | undefined;
  precision: DeliveryQuote["precision"];
};

/** Places API (New) text search: resolves street addresses, landmarks and business names to an exact pin. */
async function findPlace(address: string, lovableKey: string, mapsKey: string): Promise<Located | null> {
  const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": mapsKey,
      "Content-Type": "application/json",
      "X-Goog-FieldMask":
        "places.id,places.formattedAddress,places.location,places.displayName,places.types",
    },
    body: JSON.stringify({
      textQuery: address,
      pageSize: 1,
      regionCode: "PH",
      languageCode: "en",
      locationBias: {
        circle: { center: { latitude: SHOWROOM.lat, longitude: SHOWROOM.lng }, radius: 50000 },
      },
    }),
  });

  if (res.status === 403) throwOn403(res.status, await res.json().catch(() => null));
  if (!res.ok) {
    console.error(`Places searchText failed [${res.status}]: ${await res.text()}`);
    return null;
  }

  const json = (await res.json()) as {
    places?: {
      id?: string;
      formattedAddress?: string;
      displayName?: { text?: string };
      types?: string[];
      location?: { latitude: number; longitude: number };
    }[];
  };
  const place = json.places?.[0];
  if (!place?.location || !place.formattedAddress) return null;

  const name = place.displayName?.text;
  const isArea = (place.types ?? []).some((t) => /locality|political|administrative_area/.test(t));
  return {
    formattedAddress: name && !place.formattedAddress.startsWith(name)
      ? `${name}, ${place.formattedAddress}`
      : place.formattedAddress,
    lat: place.location.latitude,
    lng: place.location.longitude,
    placeId: place.id,
    precision: isArea ? "approximate" : "exact",
  };
}

/** Geocoding fallback: reports how precise Google's match is via location_type. */
async function geocode(address: string, lovableKey: string, mapsKey: string): Promise<Located | null> {
  const res = await fetch(
    `${GATEWAY_URL}/maps/api/geocode/json?components=country:PH&address=${encodeURIComponent(address)}`,
    {
      headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": mapsKey },
    },
  );

  if (res.status === 403) throwOn403(res.status, await res.json().catch(() => null));
  if (!res.ok) {
    console.error(`Geocode failed [${res.status}]: ${await res.text()}`);
    throw new Error(`Address lookup failed [${res.status}].`);
  }

  const json = (await res.json()) as {
    status: string;
    results?: {
      formatted_address: string;
      place_id?: string;
      geometry: { location: { lat: number; lng: number }; location_type?: string };
    }[];
  };
  const first = json.results?.[0];
  if (json.status !== "OK" || !first) return null;

  const type = first.geometry.location_type ?? "APPROXIMATE";
  const precision: DeliveryQuote["precision"] =
    type === "ROOFTOP" ? "exact" : type === "RANGE_INTERPOLATED" || type === "GEOMETRIC_CENTER" ? "street" : "approximate";

  return {
    formattedAddress: first.formatted_address,
    lat: first.geometry.location.lat,
    lng: first.geometry.location.lng,
    placeId: first.place_id,
    precision,
  };
}

export const checkDelivery = createServerFn({ method: "POST" })
  .inputValidator((input: { address: string }) => {
    const address = (input?.address ?? "").trim();
    if (address.length < 3 || address.length > 200) throw new Error("Please enter a full delivery address.");
    return { address };
  })
  .handler(async ({ data }): Promise<DeliveryQuote> => {
    const { lovableKey, mapsKey } = credentials();

    // Try the precise place lookup first, then fall back to geocoding.
    let located = await findPlace(data.address, lovableKey, mapsKey);
    if (!located || located.precision === "approximate") {
      const geo = await geocode(data.address, lovableKey, mapsKey);
      if (geo && (!located || geo.precision !== "approximate")) located = geo;
    }
    if (!located) throw new Error("We could not find that address on the map. Add the street number, barangay and city.");

    const distanceKm = Math.round(haversineKm(SHOWROOM.lat, SHOWROOM.lng, located.lat, located.lng));
    // Places results often omit the country in the formatted address, so confirm
    // by the Philippine coordinate bounds as well.
    const inPhBounds =
      located.lat >= 4.2 && located.lat <= 21.6 && located.lng >= 116 && located.lng <= 127.2;
    const available = /philippines/i.test(located.formattedAddress) || inPhBounds;
    const etaDays = available ? Math.max(3, Math.ceil(distanceKm / 180) + 2) : 0;

    const precisionNote =
      located.precision === "exact"
        ? "Pinpointed to the exact building entrance."
        : located.precision === "street"
          ? "Pinpointed to the street. Add a house or unit number for the exact door."
          : "Only the general area was matched. Add the street, house number and barangay for an exact pin.";

    return {
      formattedAddress: located.formattedAddress,
      lat: located.lat,
      lng: located.lng,
      placeId: located.placeId,
      precision: located.precision,
      precisionNote,
      distanceKm,
      available,
      etaDays,
      message: available
        ? `Delivery available — ${distanceKm} km from ${SHOWROOM.name}, arriving in about ${etaDays} days.`
        : `We deliver nationwide within ${SERVICE_AREA}. That address appears to be outside the country — our team will arrange an export quote.`,
    };
  });
