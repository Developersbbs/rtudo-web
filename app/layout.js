import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "next-themes";
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: "R-Tudo",
  description: "Learn English the smart way",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Apply theme classes here */}
      <body
        className="antialiased transition-colors duration-300 bg-[var(--background)] text-[var(--text-color)]"
      >
        <ThemeProvider
          attribute="class" // Adds `class="dark"` on <html>
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>{children}<Toaster position="top-center" /></AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
