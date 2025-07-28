'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const range = (start, end) =>
  Array.from({ length: end - start + 1 }, (_, i) => String(start + i).padStart(2, '0'));

const TimePickerModal = ({
  hour,
  minute,
  ampm,
  setHour,
  setMinute,
  setAmpm,
  onClose,
  onDone,
}) => {
  const itemHeight = 40;

  const hourList = range(1, 12);
  const minuteList = range(0, 59);
  const ampmList = ['AM', 'PM'];

  const hourRef = useRef(null);
  const minuteRef = useRef(null);
  const ampmRef = useRef(null);

  const scrollTo = (ref, list, val) => {
    const index = list.indexOf(val);
    if (ref.current) {
      ref.current.scrollTop = index * itemHeight;
    }
  };

  useEffect(() => {
    scrollTo(hourRef, hourList, hour);
    scrollTo(minuteRef, minuteList, minute);
    scrollTo(ampmRef, ampmList, ampm);
  }, []);

  const renderPicker = (label, ref, list, selected, setter) => (
    <div className="flex flex-col items-center w-1/3">
      <span className="text-sm text-gray-500 mb-2">{label}</span>
      <div
        ref={ref}
        className="h-[160px] w-full overflow-y-scroll no-scrollbar snap-y snap-mandatory scroll-smooth text-center"
      >
        {list.map((val) => (
          <div
            key={val}
            onClick={() => setter(val)}
            className={`h-10 flex items-center justify-center snap-start cursor-pointer ${
              selected === val
                ? 'bg-[var(--color-primary)] text-white font-bold rounded-md'
                : 'text-black'
            }`}
          >
            {val}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="relative w-[90%] max-w-sm bg-white rounded-xl px-4 py-6 shadow-lg">
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-3 right-3">
          <X className="text-gray-500" />
        </button>

        <h2 className="text-lg font-bold text-center text-[var(--color-primary)] mb-4">
          Select Time
        </h2>

        <div className="flex justify-between px-1 gap-2">
          {renderPicker('Hour', hourRef, hourList, hour, setHour)}
          {renderPicker('Minute', minuteRef, minuteList, minute, setMinute)}
          {renderPicker('AM/PM', ampmRef, ampmList, ampm, setAmpm)}
        </div>

        <button
          onClick={onDone}
          className="mt-6 w-full py-3 rounded-full bg-[var(--color-primary)] text-white font-semibold"
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default TimePickerModal;
