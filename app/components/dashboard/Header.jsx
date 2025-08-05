"use client";
import Image from "next/image";
import { MdOutlineWbSunny, MdOutlineDarkMode } from "react-icons/md";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show fallback until hydrated
  if (!mounted) {
    return (
      <div
        className="flex items-center justify-between p-4 rounded-xl shadow-sm"
        style={{
          background:
            "linear-gradient(to right, var(--background), var(--accent))",
        }}
      >
        <Image
          src="https://firebasestorage.googleapis.com/v0/b/tudo-english-app.appspot.com/o/app-assets%2Fassets%2Flogo-light.png?alt=media&token=5c8816e7-58b1-4761-a263-76bb034ae253" // default logo
          alt="R-Tudo Logo"
          unoptimized={true}
          width={120}
          height={120}
        />
        <div className="text-2xl p-2">
          <MdOutlineWbSunny />
        </div>
      </div>
    );
  }

  const logoSrc =
    theme === "dark" ? "https://firebasestorage.googleapis.com/v0/b/tudo-english-app.appspot.com/o/app-assets%2Fassets%2Flogo-dark.png?alt=media&token=0bff07da-2199-410c-9a95-62532a3398e5" : "https://firebasestorage.googleapis.com/v0/b/tudo-english-app.appspot.com/o/app-assets%2Fassets%2Flogo-light.png?alt=media&token=5c8816e7-58b1-4761-a263-76bb034ae253";

  return (
    <div
      className="flex items-center justify-between p-4 rounded-xl shadow-sm"
      style={{
        background:
          "linear-gradient(to right, var(--background), var(--accent))",
        borderColor: "var(--card-border)",
      }}
    >
      <Image
        src={logoSrc}
        alt="R-Tudo Logo"
        width={120}
        height={120}
        unoptimized={true}
      />

      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="text-2xl p-2 rounded-full transition-all duration-200 hover:scale-110"
        style={{
          color: "var(--color-primary)",
          backgroundColor: "transparent",
        }}
        onMouseEnter={(e) => (e.target.style.backgroundColor = "var(--accent)")}
        onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
      >
        {theme === "dark" ? <MdOutlineWbSunny /> : <MdOutlineDarkMode />}
      </button>
    </div>
  );
}
