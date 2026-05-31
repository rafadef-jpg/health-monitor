"use client";

import { useEffect, useState } from "react";

type Props = {
  semaphore: string;
  sleepScore: number | null;
  stressScore: number | null;
  streak: number;
};

type Scene = {
  phrase: string;
  svg: React.ReactNode;
};

function CoffinSVG() {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
      <rect x="30" y="20" width="60" height="80" rx="8" fill="#6b7280" stroke="#374151" strokeWidth="2"/>
      <path d="M30 40 L20 50 L30 60" stroke="#374151" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M90 40 L100 50 L90 60" stroke="#374151" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <rect x="50" y="45" width="20" height="3" rx="1.5" fill="#d1fae5"/>
      <rect x="57" y="38" width="6" height="17" rx="3" fill="#d1fae5"/>
      <circle cx="60" cy="30" r="6" fill="#fbbf24"/>
      <path d="M56 28 Q60 32 64 28" stroke="#374151" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <circle cx="57" cy="27" r="1.5" fill="#374151"/>
      <circle cx="63" cy="27" r="1.5" fill="#374151"/>
      <text x="60" y="115" textAnchor="middle" fontSize="9" fill="#6b7280" fontFamily="system-ui">zZzZ</text>
    </svg>
  );
}

function ZombieSVG() {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
      <circle cx="60" cy="35" r="20" fill="#d1fae5" stroke="#374151" strokeWidth="2"/>
      <circle cx="53" cy="33" r="3" fill="white" stroke="#374151" strokeWidth="1"/>
      <circle cx="67" cy="33" r="3" fill="white" stroke="#374151" strokeWidth="1"/>
      <circle cx="54" cy="34" r="1.5" fill="#374151"/>
      <circle cx="68" cy="34" r="1.5" fill="#374151"/>
      <path d="M52 43 Q60 40 68 43" stroke="#374151" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <rect x="45" y="55" width="30" height="35" rx="4" fill="#9ca3af" stroke="#374151" strokeWidth="2"/>
      <line x1="60" y1="55" x2="60" y2="90" stroke="#374151" strokeWidth="1"/>
      <path d="M45 70 L30 65" stroke="#9ca3af" strokeWidth="6" strokeLinecap="round"/>
      <path d="M75 65 L95 60" stroke="#9ca3af" strokeWidth="6" strokeLinecap="round"/>
      <line x1="95" y1="60" x2="100" y2="65" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round"/>
      <line x1="95" y1="60" x2="102" y2="58" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round"/>
      <line x1="95" y1="60" x2="100" y2="55" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round"/>
      <rect x="48" y="90" width="10" height="20" rx="3" fill="#9ca3af" stroke="#374151" strokeWidth="2"/>
      <rect x="62" y="90" width="10" height="20" rx="3" fill="#9ca3af" stroke="#374151" strokeWidth="2"/>
    </svg>
  );
}

function CouchSVG() {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
      <rect x="10" y="65" width="100" height="35" rx="10" fill="#f59e0b" stroke="#374151" strokeWidth="2"/>
      <rect x="10" y="55" width="20" height="45" rx="8" fill="#d97706" stroke="#374151" strokeWidth="2"/>
      <rect x="90" y="55" width="20" height="45" rx="8" fill="#d97706" stroke="#374151" strokeWidth="2"/>
      <circle cx="60" cy="55" r="14" fill="#fde68a" stroke="#374151" strokeWidth="2"/>
      <ellipse cx="55" cy="55" rx="3" ry="4" fill="#374151"/>
      <ellipse cx="65" cy="55" rx="3" ry="4" fill="#374151"/>
      <path d="M53 63 Q60 67 67 63" stroke="#374151" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <rect x="38" y="62" width="44" height="12" rx="4" fill="#fde68a" stroke="#374151" strokeWidth="1"/>
      <text x="60" y="110" textAnchor="middle" fontSize="8" fill="#9ca3af" fontFamily="system-ui">modo batata</text>
    </svg>
  );
}

function BatterySVG() {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
      <rect x="15" y="35" width="80" height="50" rx="8" fill="white" stroke="#374151" strokeWidth="2"/>
      <rect x="95" y="50" width="10" height="20" rx="3" fill="#374151"/>
      <rect x="17" y="37" width="12" height="46" rx="3" fill="#ef4444"/>
      <text x="60" y="68" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#374151" fontFamily="system-ui">3%</text>
      <path d="M50 85 L58 70 L54 70 L62 55 L46 72 L52 72 Z" fill="#facc15" stroke="#d97706" strokeWidth="1"/>
      <text x="60" y="110" textAnchor="middle" fontSize="8" fill="#9ca3af" fontFamily="system-ui">carregando... lentamente</text>
    </svg>
  );
}

function StressSVG() {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
      <circle cx="60" cy="50" r="28" fill="#fef3c7" stroke="#374151" strokeWidth="2"/>
      <circle cx="50" cy="45" r="4" fill="white" stroke="#374151" strokeWidth="1.5"/>
      <circle cx="70" cy="45" r="4" fill="white" stroke="#374151" strokeWidth="1.5"/>
      <circle cx="52" cy="46" r="2" fill="#374151"/>
      <circle cx="72" cy="46" r="2" fill="#374151"/>
      <path d="M50 44 Q50 40 54 40" stroke="#374151" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M70 44 Q70 40 66 40" stroke="#374151" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M50 62 Q60 56 70 62" stroke="#374151" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M55 22 Q60 10 65 22" stroke="#ef4444" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M42 28 Q35 18 45 24" stroke="#f97316" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M78 28 Q85 18 75 24" stroke="#f97316" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <rect x="20" y="85" width="80" height="20" rx="8" fill="#fde68a" stroke="#d97706" strokeWidth="2"/>
      <text x="60" y="99" textAnchor="middle" fontSize="9" fill="#374151" fontFamily="system-ui" fontWeight="bold">cafe cafe cafe</text>
    </svg>
  );
}

function TrophySVG() {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
      <path d="M40 20 h40 v35 q0 25-20 30 q-20-5-20-30 Z" fill="#fbbf24" stroke="#374151" strokeWidth="2"/>
      <path d="M40 30 Q20 30 20 50 Q20 65 40 65" stroke="#fbbf24" strokeWidth="6" fill="none" strokeLinecap="round"/>
      <path d="M80 30 Q100 30 100 50 Q100 65 80 65" stroke="#fbbf24" strokeWidth="6" fill="none" strokeLinecap="round"/>
      <rect x="52" y="85" width="16" height="10" fill="#d97706" stroke="#374151" strokeWidth="1"/>
      <rect x="38" y="95" width="44" height="8" rx="3" fill="#d97706" stroke="#374151" strokeWidth="2"/>
      <text x="60" y="115" textAnchor="middle" fontSize="8" fill="#9ca3af" fontFamily="system-ui">surpreendentemente</text>
    </svg>
  );
}

function SnoozeSVG() {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
      <ellipse cx="60" cy="75" rx="45" ry="30" fill="#e0e7ff" stroke="#374151" strokeWidth="2"/>
      <circle cx="60" cy="55" r="20" fill="#fde68a" stroke="#374151" strokeWidth="2"/>
      <path d="M52 55 Q60 60 68 55" stroke="#374151" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <ellipse cx="50" cy="51" rx="4" ry="2" fill="#374151"/>
      <ellipse cx="70" cy="51" rx="4" ry="2" fill="#374151"/>
      <text x="85" y="35" fontSize="10" fill="#6b7280" fontFamily="system-ui">z</text>
      <text x="92" y="25" fontSize="13" fill="#6b7280" fontFamily="system-ui">Z</text>
      <text x="100" y="15" fontSize="16" fill="#6b7280" fontFamily="system-ui">Z</text>
    </svg>
  );
}

function getScenes(
  semaphore: string,
  sleepScore: number | null,
  stressScore: number | null,
  streak: number
): Scene[] {
  const all: Scene[] = [
    { phrase: "Dormiu feito morto. Mas de um jeito ruim.", svg: <CoffinSVG /> },
    { phrase: "Seu corpo ta funcionando no modo zumbi.", svg: <ZombieSVG /> },
    { phrase: "Bateria critica. Recarregue imediatamente.", svg: <BatterySVG /> },
    { phrase: "Modo batata ativado. Sofa: 1 x Academia: 0.", svg: <CouchSVG /> },
    { phrase: "Nivel de estresse: precisando de cafe intravenoso.", svg: <StressSVG /> },
    { phrase: "Dormindo mal ha dias. Snooze virou estilo de vida.", svg: <SnoozeSVG /> },
    { phrase: "Surpreendentemente funcional. Nao estrague.", svg: <TrophySVG /> },
  ];

  const relevant: Scene[] = [];
  if (semaphore === "red" || semaphore === "orange") relevant.push(all[1], all[2]);
  if ((sleepScore ?? 100) < 60) relevant.push(all[0], all[5]);
  if ((stressScore ?? 0) > 40) relevant.push(all[4]);
  if (semaphore === "green") relevant.push(all[6]);
  if (streak > 0 && semaphore !== "green") relevant.push(all[3]);

  return relevant.length > 0 ? relevant : all.slice(0, 3);
}

const MORNING_GREETINGS = [
  "Voce acordou. Que milagre.",
  "Ainda vivo. Inesperado.",
  "O travesseiro perdeu. Por hoje.",
  "Seu corpo disse nao. Voce ignorou. Respeito.",
  "Acordou. Parabens pelo basico.",
];

export function CrueldadeMatinal({ semaphore, sleepScore, stressScore, streak }: Props) {
  const scenes = getScenes(semaphore, sleepScore, stressScore, streak);
  const [idx, setIdx] = useState(0);
  const greeting = MORNING_GREETINGS[new Date().getDay() % MORNING_GREETINGS.length];

  useEffect(() => {
    if (scenes.length <= 1) return;
    const t = setInterval(() => setIdx((prev) => (prev + 1) % scenes.length), 8000);
    return () => clearInterval(t);
  }, [scenes.length]);

  const scene = scenes[idx];

  return (
    <section className="biometric-panel rounded-2xl overflow-hidden">
      <div className="bg-rose-50 border-b border-rose-100 px-4 py-2 flex items-center gap-2">
        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-rose-500">
          Crueldade Matinal
        </span>
        {scenes.length > 1 && (
          <div className="flex gap-1 ml-auto">
            {scenes.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={["size-1.5 rounded-full transition", i === idx ? "bg-rose-400" : "bg-rose-200"].join(" ")}
              />
            ))}
          </div>
        )}
      </div>
      <div className="px-4 pt-3 pb-1">
        <p className="text-rose-400 text-xs font-black uppercase tracking-widest">{greeting}</p>
      </div>
      <div className="flex items-center gap-4 px-4 pb-4">
        <div className="size-20 shrink-0">
          {scene.svg}
        </div>
        <p className="text-slate-700 text-sm font-semibold leading-snug">{scene.phrase}</p>
      </div>
    </section>
  );
}
