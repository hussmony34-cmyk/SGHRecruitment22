import "./globals.css";

export const metadata = {
  title: "Careers | Saudi German Health",
  description: "Join Saudi German Health and start your healthcare career journey.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr">
      <body>{children}</body>
    </html>
  );
}
