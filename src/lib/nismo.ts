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
    base: 13250000,
    power: "600 HP",
    zeroToSixty: "2.5 s",
    topSpeed: "315 km/h",
    drivetrain: "ATTESA E-TS AWD",
    image: gtr,
  },
  {
    id: "skyline-r34-nismo",
    name: "SKYLINE GT-R R34 NISMO",
    tagline: "The RB26 legend, Z-tune spirit",
    base: 18500000,
    power: "500 HP",
    zeroToSixty: "3.8 s",
    topSpeed: "300 km/h",
    drivetrain: "ATTESA E-TS Pro AWD",
    image: r34,
  },
  {
    id: "skyline-r33-nismo",
    name: "SKYLINE GT-R R33 400R",
    tagline: "Midnight purple, 400 horses",
    base: 12900000,
    power: "400 HP",
    zeroToSixty: "4.0 s",
    topSpeed: "303 km/h",
    drivetrain: "ATTESA E-TS AWD",
    image: r33,
  },
  {
    id: "skyline-r32-nismo",
    name: "SKYLINE GT-R R32 NISMO",
    tagline: "Group A homologation special",
    base: 6750000,
    power: "280 HP",
    zeroToSixty: "4.7 s",
    topSpeed: "250 km/h",
    drivetrain: "ATTESA E-TS AWD",
    image: r32,
  },
  {
    id: "silvia-s15-nismo",
    name: "SILVIA S15 NISMO",
    tagline: "Drift royalty, factory sharpened",
    base: 2950000,
    power: "250 HP",
    zeroToSixty: "5.5 s",
    topSpeed: "235 km/h",
    drivetrain: "Rear-wheel drive",
    image: s15,
  },
  {
    id: "z-nismo",
    name: "Z NISMO",
    tagline: "Twin-turbo heritage, sharpened",
    base: 3850000,
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
    base: 3390000,
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
    base: 1860000,
    power: "215 HP",
    zeroToSixty: "7.0 s",
    topSpeed: "220 km/h",
    drivetrain: "Front-wheel drive",
    image: juke,
  },
];

export const PAINTS: Option[] = [
  { id: "pearl-white", label: "Brilliant White Pearl", price: 0 },
  { id: "stealth-black", label: "Stealth Matte Black", price: 275000 },
  { id: "vibrant-red", label: "NISMO Vibrant Red", price: 185000 },
  { id: "bayside-blue", label: "Bayside Blue", price: 320000 },
  { id: "midnight-purple", label: "Midnight Purple III", price: 395000 },
];

export const WHEELS: Option[] = [
  { id: "forged-19", label: '19" RAYS Forged', price: 0 },
  { id: "forged-20", label: '20" RAYS Forged Black', price: 350000 },
  { id: "track-20", label: '20" Track Series Bronze', price: 480000 },
];

export const INTERIORS: Option[] = [
  { id: "alcantara", label: "Alcantara / Red Stitch", price: 0 },
  { id: "recaro", label: "RECARO Carbon Buckets", price: 555000 },
  { id: "leather", label: "Full Grain Leather", price: 310000 },
];

export const PACKAGES: Option[] = [
  { id: "carbon", label: "Carbon Aero Package", price: 830000, note: "Splitter, canards, rear wing" },
  { id: "brakes", label: "Brembo Track Brakes", price: 510000, note: "Carbon ceramic rotors" },
  { id: "suspension", label: "Bilstein DampTronic", price: 385000, note: "Adaptive circuit damping" },
  { id: "telemetry", label: "NISMO Telemetry Suite", price: 225000, note: "On-board lap logging" },
];

export const TAX_RATE = 0.12;
export const DELIVERY_FEE = 140000;

export const money = (n: number) =>
  n.toLocaleString("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
