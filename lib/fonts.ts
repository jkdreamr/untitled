import { Space_Grotesk, Instrument_Serif, Space_Mono } from "next/font/google";

/** UI typeface — locked NOVUM brand face. Self-hosted by next/font (no runtime request). */
export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
  weight: ["300", "400", "500", "600", "700"],
});

/** Editorial serif — piece titles, words-pieces, editorial moments. */
export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
});

/** Metadata face — dates, durations, `untitled no. 47`, tags. */
export const spaceMono = Space_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-mono",
  weight: ["400", "700"],
});

export const fontVariables = `${spaceGrotesk.variable} ${instrumentSerif.variable} ${spaceMono.variable}`;
