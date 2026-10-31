import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Grainient } from "@/components/grainient";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "atmos",
  title: "atmos",
  description: "Current conditions, the next twenty-four hours and a ten day outlook.",
};

export const viewport: Viewport = {
  themeColor: "#f5f5f7",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="sky-backdrop" aria-hidden="true">
          <Grainient
            colors={["#5f9bd8", "#9dc1e8", "#c2d2ec", "#d7d8eb", "#eddccb"]}
            type="linear"
            angle={38}
            bands={1}
            speed={0.1}
            flow={0.3}
            scale={1.5}
            softness={1}
            silk={0.45}
            grainAmount={0.1}
            grainSize={1.2}
            contrast={1}
            saturation={0.98}
            interactive
            stir={0.7}
            clickSwirl={false}
            intro
          />
        </div>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
