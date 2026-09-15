import gtr from "@/assets/gtr-nismo.jpg";
import z from "@/assets/z-nismo.jpg";
import juke from "@/assets/juke-nismo.jpg";
import ariya from "@/assets/ariya-nismo.jpg";
import r34 from "@/assets/skyline-r34-nismo.jpg";
import r33 from "@/assets/skyline-r33-nismo.jpg";
import r32 from "@/assets/skyline-r32-nismo.jpg";
import s15 from "@/assets/silvia-s15-nismo.jpg";

export type Option = { id: string; label: string; price: number; note?: string };

export type NismoModel = {
  id: string;
  name: string;
  tagline: string;
  base: number;
  power: string;
  zeroToSixty: string;
  topSpeed: string;
  drivetrain: string;
  image: string;
};

export const MODELS: NismoModel[] = [
  {
    id: "gtr-nismo",
    name: "GT-R NISMO",
    tagline: "Godzilla, homologated for the road",
    base: 232000,
    power: "600 HP",
    zeroToSixty: "2.5 s",
    topSpeed: "315 km/h",
    drivetrain: "ATTESA E-TS AWD",
    image: gtr,
  },
  {
    id: "z-nismo",
    name: "Z NISMO",
    tagline: "Twin-turbo heritage, sharpened",
    base: 66890,
    power: "420 HP",
    zeroToSixty: "4.3 s",
    topSpeed: "250 km/h",
    drivetrain: "Rear-wheel drive",
    image: z,
  },
  {
    id: "ariya-nismo",
    name: "ARIYA NISMO",
    tagline: "Silent torque, circuit tuned",
    base: 58900,
    power: "429 HP",
    zeroToSixty: "4.9 s",
    topSpeed: "200 km/h",
    drivetrain: "e-4ORCE AWD",
    image: ariya,
  },
  {
    id: "juke-nismo",
    name: "JUKE NISMO RS",
    tagline: "Pocket-sized aggression",
    base: 32400,
    power: "215 HP",
    zeroToSixty: "7.0 s",
    topSpeed: "220 km/h",
    drivetrain: "Front-wheel drive",
    image: juke,
  },
];

export const PAINTS: Option[] = [
  { id: "pearl-white", label: "Brilliant White Pearl", price: 0 },
  { id: "stealth-black", label: "Stealth Matte Black", price: 4800 },
  { id: "vibrant-red", label: "NISMO Vibrant Red", price: 3200 },
  { id: "bayside-blue", label: "Bayside Blue", price: 5600 },
];

export const WHEELS: Option[] = [
  { id: "forged-19", label: '19" RAYS Forged', price: 0 },
  { id: "forged-20", label: '20" RAYS Forged Black', price: 6100 },
  { id: "track-20", label: '20" Track Series Bronze', price: 8400 },
];

export const INTERIORS: Option[] = [
  { id: "alcantara", label: "Alcantara / Red Stitch", price: 0 },
  { id: "recaro", label: "RECARO Carbon Buckets", price: 9700 },
  { id: "leather", label: "Full Grain Leather", price: 5400 },
];

export const PACKAGES: Option[] = [
  { id: "carbon", label: "Carbon Aero Package", price: 14500, note: "Splitter, canards, rear wing" },
  { id: "brakes", label: "Brembo Track Brakes", price: 8900, note: "Carbon ceramic rotors" },
  { id: "suspension", label: "Bilstein DampTronic", price: 6700, note: "Adaptive circuit damping" },
  { id: "telemetry", label: "NISMO Telemetry Suite", price: 3900, note: "On-board lap logging" },
];

export const TAX_RATE = 0.12;
export const DELIVERY_FEE = 2450;

export const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
