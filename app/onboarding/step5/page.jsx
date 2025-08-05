"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";

const levels = [
  {
    title: "App Store/Play Store",
    image: "https://firebasestorage.googleapis.com/v0/b/tudo-english-app.appspot.com/o/app-assets%2Ficons%2Fplaystore.png?alt=media&token=8f1c4342-703c-4a28-9903-67a91bee5da2",
  },
  {
    title: "Social Media",
    images: ["https://firebasestorage.googleapis.com/v0/b/tudo-english-app.appspot.com/o/app-assets%2Ficons%2Ffb.png?alt=media&token=16c16432-2cd4-4540-bb9c-b87cb2ad5d29", "https://firebasestorage.googleapis.com/v0/b/tudo-english-app.appspot.com/o/app-assets%2Ficons%2Finsta.png?alt=media&token=5285ae00-5a88-480f-a1cf-17e6915287e5", "https://firebasestorage.googleapis.com/v0/b/tudo-english-app.appspot.com/o/app-assets%2Ficons%2Flinkedin.png?alt=media&token=682f2031-d077-44bc-a8c8-db4bf1c1bb5d"],
  },
  {
    title: "Friend/Family",
    image: "https://firebasestorage.googleapis.com/v0/b/tudo-english-app.appspot.com/o/app-assets%2Ficons%2Ffriend.png?alt=media&token=fbe2f2d2-9a99-465e-937d-58865c6fd7bd",
  },
  {
    title: "Advertisement",
    image: "https://firebasestorage.googleapis.com/v0/b/tudo-english-app.appspot.com/o/app-assets%2Ficons%2Fad.png?alt=media&token=4fd4acd9-f271-452f-b355-51bc247ac7e4",
  },
  {
    title: "Search Engine",
    image: "https://firebasestorage.googleapis.com/v0/b/tudo-english-app.appspot.com/o/app-assets%2Ficons%2Fgoogle.png?alt=media&token=c72c8be7-6b4f-469b-8cf0-d3f89f62a63e",
  },
];

export default function HowDidYouFindUs() {
  const router = useRouter();
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleContinue = () => {
    if (selected) {
      router.push("/main");
    }
  };

  const handleBack = () => router.back();
  const progress = 100;

  return (
    <div className="min-h-screen bg-white flex justify-center px-4 py-8">
      <div className="w-full max-w-md flex flex-col justify-between">
        {/* Progress bar */}
        <div className="w-full h-1 bg-gray-200 rounded mb-6 overflow-hidden">
          <div
            className="h-full bg-[var(--color-primary)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Back button */}
        <button
          onClick={handleBack}
          className="mb-4 text-[var(--color-primary)] hover:opacity-80 transition"
        >
          <ArrowLeft />
        </button>

        {/* Title */}
        <h1 className="text-2xl font-bold text-[var(--color-primary)] mb-2">
          How did you find us?
        </h1>
        <p className="text-gray-500 mb-4">
          Help us understand how you discovered R-Tudo
        </p>

        {/* Options */}
        <div className="space-y-4 mb-6 overflow-y-auto max-h-[400px] pr-1 min-h-[150px]">
          {levels.map(({ title, image, images }) => {
            const isSelected = selected === title;

            return (
              <button
                key={title}
                onClick={() => setSelected(title)}
                className={`w-full text-left p-4 rounded-lg border-2 flex items-start gap-4 transition-all duration-200 ${
                  isSelected
                    ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm"
                    : "bg-white text-gray-800 border-gray-50 hover:border-[var(--color-primary)] hover:bg-gray-50"
                }`}
              >
                <div
                  className={`w-10 h-10 flex items-center justify-center rounded-full border ${
                    isSelected
                      ? "bg-white/20 border-white"
                      : "bg-gray-100 border-gray-300"
                  }`}
                >
                  {images ? (
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex gap-[1px] mb-[2px]">
                        <Image
                          src={images[0]}
                          alt="fb"
                          width={12}
                          height={12}
                          className="object-contain"
                          unoptimized={true}
                        />
                        <Image
                          src={images[1]}
                          alt="insta"
                          width={12}
                          height={12}
                          className="object-contain"
                          unoptimized={true}
                        />
                      </div>
                      <Image
                        src={images[2]}
                        alt="linkedin"
                        width={12}
                        height={12}
                        className="object-contain"
                        unoptimized={true}
                      />
                    </div>
                  ) : (
                    <Image
                      src={image}
                      alt={title}
                      width={24}
                      height={24}
                      className="object-contain"
                      unoptimized={true}
                    />
                  )}
                </div>

                <div>
                  <h2
                    className={`font-semibold text-lg ${isSelected ? "text-white" : "text-gray-800"}`}
                  >
                    {title}
                  </h2>
                </div>
              </button>
            );
          })}
        </div>

        {/* Continue button */}
        <button
          disabled={!selected}
          onClick={handleContinue}
          className={`w-full mt-2 py-3 rounded-full text-white font-bold ${
            selected ? "bg-[var(--color-primary)]" : "bg-gray-300"
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
