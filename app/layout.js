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
      <body className="antialiased transition-colors duration-300 bg-[var(--background)] text-[var(--text-color)]">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster position="top-center" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
