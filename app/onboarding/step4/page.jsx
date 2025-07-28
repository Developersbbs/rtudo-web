'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BellRing,
  Clock,
  Timer,
  AlarmClock,
  Hourglass,
  Watch,
} from 'lucide-react';
import TimePickerModal from '@/app/components/TimePicker';

const options = [
  { label: '15 minutes', icon: Timer },
  { label: '30 minutes', icon: AlarmClock },
  { label: '45 minutes', icon: Hourglass },
  { label: '1 hour', icon: Watch },
];

const getFormattedTime = (h, m, ampm) => {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
};

export default function LearningTime() {
  const router = useRouter();
  const [learningTime, setLearningTime] = useState(null);
  const [reminderTime, setReminderTime] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [hour, setHour] = useState('03');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmpm] = useState('PM');

  useEffect(() => {
    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes();
    const am = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const formattedHour = String(h).padStart(2, '0');
    const formattedMinute = String(m).padStart(2, '0');
    setHour(formattedHour);
    setMinute(formattedMinute);
    setAmpm(am);
    setReminderTime(`${formattedHour}:${formattedMinute} ${am}`);
  }, []);

  const handleContinue = () => {
    if (!learningTime || !reminderTime) return;

    localStorage.setItem(
      'learningPreferences',
      JSON.stringify({
        learningTime,
        reminderTime,
      })
    );

    router.push('/onboarding/step5');
  };

  const handleTimeDone = () => {
    setReminderTime(getFormattedTime(hour, minute, ampm));
    setShowPicker(false);
  };

  return (
    <div className="min-h-screen bg-white flex justify-center px-4 py-8 relative">
      <div className="w-full max-w-md flex flex-col justify-between relative z-10">
        {/* Progress Bar */}
        <div className="w-full h-1 bg-gray-200 rounded mb-6 overflow-hidden">
          <div
            className="h-full bg-[var(--color-primary)] transition-all duration-300"
            style={{ width: '80%' }}
          />
        </div>

        {/* Back Button */}
        <button onClick={() => router.back()} className="mb-4 text-[var(--color-primary)]">
          <ArrowLeft />
        </button>

        <h1 className="text-2xl font-bold text-[var(--color-primary)] mb-1">Daily Learning Time</h1>
        <p className="text-gray-500 mb-4">How much time can you dedicate each day?</p>

        {/* Time Options */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {options.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setLearningTime(label)}
              className={`flex items-center gap-3 border-2 rounded-lg p-4 text-left transition-all ${
                learningTime === label
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/20 font-bold text-black'
                  : 'border-gray-200 hover:border-[var(--color-primary)] text-gray-800'
              }`}
            >
              <Icon
                size={20}
                className={learningTime === label ? 'text-[var(--color-primary)]' : 'text-gray-500'}
              />
              {label}
            </button>
          ))}
        </div>

        {/* Reminder */}
        <div className="mb-6">
          <p className="font-medium text-[var(--color-primary)] mb-2 flex items-center gap-2">
            <BellRing size={18} />
            Daily Reminder
          </p>
          <p className="text-gray-500 text-sm mb-2">Set a time to remind you to practice</p>
          <div className="relative">
            <Clock
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-primary)]"
              size={18}
            />
            <input
              type="text"
              readOnly
              value={reminderTime}
              onClick={() => setShowPicker(true)}
              className="w-full border border-gray-300 rounded-lg p-3 pl-10 text-black focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!learningTime || !reminderTime}
          className={`w-full mt-2 py-3 rounded-full text-white font-bold transition ${
            learningTime && reminderTime ? 'bg-[var(--color-primary)]' : 'bg-gray-300'
          }`}
        >
          Continue
        </button>
      </div>

      {/* Time Picker Modal */}
      {showPicker && (
        <TimePickerModal
          hour={hour}
          minute={minute}
          ampm={ampm}
          setHour={setHour}
          setMinute={setMinute}
          setAmpm={setAmpm}
          onClose={() => setShowPicker(false)}
          onDone={handleTimeDone}
        />
      )}
    </div>
  );
}
