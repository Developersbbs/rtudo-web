'use client';

import { useRouter } from 'next/navigation';
import {
  FaMicrophone,
  FaHeadphones,
  FaPen,
  FaBookOpen,
} from 'react-icons/fa';

export default function PracticeSkillsCard() {
  const router = useRouter();

  return (
    <div
      className="rounded-xl shadow p-4"
      style={{
        backgroundColor: 'var(--card-background)',
        color: 'var(--text-color)',
      }}
    >
      <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-color)' }}>
        Practice Skills
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <SkillCard
          icon={<FaMicrophone size={18} />}
          iconBg="bg-red-100"
          iconColor="text-red-500"
          title="Speaking"
          subtitle="Practice pronunciation"
          onClick={() => router.push('/practice/exam/speaking')}
        />
        <SkillCard
          icon={<FaHeadphones size={18} />}
          iconBg="bg-green-100"
          iconColor="text-green-500"
          title="Listening"
          subtitle="Improve comprehension"
          onClick={() => router.push('/practice/exam/listening')}
        />
        <SkillCard
          icon={<FaPen size={18} />}
          iconBg="bg-blue-100"
          iconColor="text-blue-500"
          title="Writing"
          subtitle="Practice your writing skills"
          onClick={() => router.push('/practice/exam/writing')}
        />
        <SkillCard
          icon={<FaBookOpen size={18} />}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-500"
          title="Reading"
          subtitle="Enhance reading skills"
          onClick={() => router.push('/practice/exam/reading')}
        />
      </div>
    </div>
  );
}

function SkillCard({ icon, iconBg, iconColor, title, subtitle, onClick }) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-xl flex flex-col items-center justify-center p-4 text-center hover:shadow transition-all duration-200"
      style={{ backgroundColor: 'var(--accent)' }}
    >
      <div
        className={`p-3 rounded-full mb-2 ${iconBg}`}
      >
        <span className={`${iconColor}`}>{icon}</span>
      </div>
      <h4 className="font-semibold" style={{ color: 'var(--text-color)' }}>
        {title}
      </h4>
      <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
        {subtitle}
      </p>
    </div>
  );
}
