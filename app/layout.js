import "./globals.css";

export const metadata = {
  title: "RamsS Fotografía | Fotografía con intención",
  description: "Fotografía editorial, retratos, eventos y proyectos comerciales.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
