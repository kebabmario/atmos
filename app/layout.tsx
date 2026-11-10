import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

// same family as kebabmario.dev, the sibling site
const font = Bricolage_Grotesque({ subsets: ["latin"], axes: ["opsz", "wdth"] });

export const metadata: Metadata = {
  applicationName: "atmos",
  title: "atmos",
  description: "Current conditions, the next twenty-four hours and a ten day outlook.",
};

export const viewport: Viewport = {
  themeColor: "#0b0d14",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={font.className}>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
