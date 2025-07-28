'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';

const levels = [
  {
    title: 'App Store/Play Store',
    image: '/icons/playstore.png',
  },
  {
    title: 'Social Media',
    images: [
      '/icons/fb.png',
      '/icons/insta.png',
      '/icons/linkedin.png',
    ],
  },
  {
    title: 'Friend/Family',
    image: '/icons/friend.png',
  },
  {
    title: 'Advertisement',
    image: '/icons/ad.png',
  },
  {
    title: 'Search Engine',
    image: '/icons/google.png',
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
      router.push('/main');
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
                        <Image src={images[0]} alt="fb" width={12} height={12} className="object-contain" />
                        <Image src={images[1]} alt="insta" width={12} height={12} className="object-contain" />
                      </div>
                      <Image src={images[2]} alt="linkedin" width={12} height={12} className="object-contain" />
                    </div>
                  ) : (
                    <Image src={image} alt={title} width={24} height={24} className="object-contain" />
                  )}
                </div>

                <div>
                  <h2 className={`font-semibold text-lg ${isSelected ? "text-white" : "text-gray-800"}`}>
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
