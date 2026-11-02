import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata = {
  title: "RamsS Fotografía | Fotografía con intención",
  description: "Fotografía editorial, retratos, eventos y proyectos comerciales.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
