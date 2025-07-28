'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const languages = [
  { name: 'English', native: 'English' },
  { name: 'Tamil', native: 'தமிழ்' },
  { name: 'Hindi', native: 'हिंदी' },
  { name: 'Bengali', native: 'বাংলা' },
  { name: 'Telugu', native: 'తెలుగు' },
  { name: 'Marathi', native: 'मराठी' },
  { name: 'Gujarati', native: 'ગુજરાતી' },
  { name: 'Kannada', native: 'ಕನ್ನಡ' },
  { name: 'Malayalam', native: 'മലയാളം' },
  { name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { name: 'Urdu', native: 'اردو' },
  { name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { name: 'Assamese', native: 'অসমীয়া' },
  { name: 'Spanish', native: 'Español' },
  { name: 'French', native: 'Français' },
  { name: 'German', native: 'Deutsch' },
  { name: 'Italian', native: 'Italiano' },
  { name: 'Portuguese', native: 'Português' },
  { name: 'Russian', native: 'Русский' },
  { name: 'Chinese', native: '中文' },
  { name: 'Japanese', native: '日本語' },
  { name: 'Korean', native: '한국어' }
];

export default function NativeLanguage() {
  const router = useRouter();
  const [selectedLang, setSelectedLang] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const filteredLanguages = languages.filter(lang =>
    lang.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleContinue = () => {
    if (selectedLang) {
      router.push('/onboarding/step2');
    }
  };

  const progress = 20;

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

        {/* Title */}
        <h1 className="text-2xl font-bold text-[var(--color-primary)] mb-2">
          What's your native language?
        </h1>
        <p className="text-gray-500 mb-4">
          This helps us personalize your learning experience
        </p>

        {/* Search bar */}
        <input
          type="text"
          placeholder="Search languages..."
          className="w-full p-3 mb-4 border border-gray-300 rounded text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Language list */}
        <div className="space-y-3 mb-6 overflow-y-auto max-h-[400px] pr-1 min-h-[150px]">
          {filteredLanguages.length > 0 ? (
            filteredLanguages.map((lang) => (
              <button
                key={lang.name}
                onClick={() => setSelectedLang(lang.name)}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                  selectedLang === lang.name
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/20 shadow-sm'
                    : 'border-gray-200 hover:border-[var(--color-primary)] hover:bg-gray-50'
                }`}
              >
                <div className="font-semibold text-gray-800">{lang.name}</div>
                {lang.native && (
                  <div className="text-sm text-gray-500">{lang.native}</div>
                )}
              </button>
            ))
          ) : (
            <div className="text-center text-gray-500 mt-10">
              No matches found
            </div>
          )}
        </div>

        {/* Continue button */}
        <button
          disabled={!selectedLang}
          onClick={handleContinue}
          className={`w-full mt-4 py-3 rounded-full text-white font-bold ${
            selectedLang ? 'bg-[var(--color-primary)]' : 'bg-gray-300'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
