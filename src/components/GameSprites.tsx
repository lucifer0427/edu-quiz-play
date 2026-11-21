import type { MonsterId } from '../types/quiz';

interface HeroSpriteProps {
  avatarId: string;
  size?: number;
  className?: string;
}

export function HeroSprite({
  avatarId,
  size = 96,
  className = '',
}: HeroSpriteProps) {
  switch (avatarId) {
    case 'hero-mage':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          className={className}
          aria-label="星光法師"
        >
          <circle cx="60" cy="68" r="36" fill="#ddd6fe" />
          <path d="M30 50 L60 10 L90 50 Z" fill="#7c3aed" />
          <ellipse cx="60" cy="50" rx="36" ry="9" fill="#5b21b6" />
          <polygon
            points="60,22 63,29 70,29 64,34 66,41 60,37 54,41 56,34 50,29 57,29"
            fill="#fde047"
          />
          <circle cx="60" cy="70" r="24" fill="#fde68a" />
          <circle cx="51" cy="68" r="3.8" fill="#1e293b" />
          <circle cx="69" cy="68" r="3.8" fill="#1e293b" />
          <circle cx="52.2" cy="66.8" r="1.2" fill="#ffffff" />
          <circle cx="70.2" cy="66.8" r="1.2" fill="#ffffff" />
          <circle cx="44" cy="75" r="4" fill="#fda4af" opacity="0.7" />
          <circle cx="76" cy="75" r="4" fill="#fda4af" opacity="0.7" />
          <path
            d="M54 78 Q60 84 66 78"
            stroke="#1e293b"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <line
            x1="96"
            y1="42"
            x2="104"
            y2="98"
            stroke="#92400e"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle cx="96" cy="38" r="8" fill="#fde047" />
        </svg>
      );

    case 'hero-shiba':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          className={className}
          aria-label="柴犬騎士"
        >
          <circle cx="60" cy="66" r="40" fill="#ffedd5" />
          <polygon points="28,46 38,16 54,36" fill="#ea580c" />
          <polygon points="92,46 82,16 66,36" fill="#ea580c" />
          <polygon points="33,43 40,24 49,36" fill="#fed7aa" />
          <polygon points="87,43 80,24 71,36" fill="#fed7aa" />
          <ellipse cx="60" cy="68" rx="32" ry="28" fill="#f97316" />
          <ellipse cx="60" cy="76" rx="24" ry="18" fill="#fff7ed" />
          <ellipse cx="47" cy="57" rx="4.5" ry="2.5" fill="#fff7ed" />
          <ellipse cx="73" cy="57" rx="4.5" ry="2.5" fill="#fff7ed" />
          <circle cx="48" cy="65" r="4" fill="#1e293b" />
          <circle cx="72" cy="65" r="4" fill="#1e293b" />
          <ellipse cx="60" cy="73" rx="5" ry="3.5" fill="#1e293b" />
          <path
            d="M53 81 Q60 87 67 81"
            stroke="#1e293b"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <rect x="40" y="92" width="40" height="10" rx="5" fill="#ef4444" />
        </svg>
      );

    case 'hero-cat':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          className={className}
          aria-label="貓咪學者"
        >
          <circle cx="60" cy="64" r="38" fill="#fce7f3" />
          <polygon points="30,52 34,20 52,38" fill="#f472b6" />
          <polygon points="90,52 86,20 68,38" fill="#f472b6" />
          <ellipse cx="60" cy="68" rx="30" ry="26" fill="#fbcfe8" />
          <circle cx="48" cy="66" r="10" fill="none" stroke="#334155" strokeWidth="3" />
          <circle cx="72" cy="66" r="10" fill="none" stroke="#334155" strokeWidth="3" />
          <line x1="58" y1="66" x2="62" y2="66" stroke="#334155" strokeWidth="3" />
          <circle cx="48" cy="66" r="3.5" fill="#1e293b" />
          <circle cx="72" cy="66" r="3.5" fill="#1e293b" />
          <polygon points="57,74 63,74 60,78" fill="#ec4899" />
          <path
            d="M53 82 Q60 87 67 82"
            stroke="#1e293b"
            strokeWidth="2.8"
            fill="none"
            strokeLinecap="round"
          />
          <rect x="36" y="24" width="48" height="8" rx="2" fill="#1e293b" />
          <polygon points="60,12 90,24 60,32 30,24" fill="#334155" />
        </svg>
      );

    case 'hero-robot':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          className={className}
          aria-label="機器人助手"
        >
          <circle cx="60" cy="64" r="40" fill="#e0f2fe" />
          <line x1="60" y1="16" x2="60" y2="30" stroke="#0284c7" strokeWidth="4" />
          <circle cx="60" cy="14" r="6" fill="#38bdf8" />
          <rect x="30" y="30" width="60" height="54" rx="14" fill="#0ea5e9" />
          <rect x="38" y="42" width="44" height="28" rx="8" fill="#0f172a" />
          <circle cx="49" cy="56" r="5" fill="#38bdf8" />
          <circle cx="71" cy="56" r="5" fill="#38bdf8" />
          <path
            d="M50 76 H70"
            stroke="#e0f2fe"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <rect x="22" y="48" width="8" height="20" rx="4" fill="#facc15" />
          <rect x="90" y="48" width="8" height="20" rx="4" fill="#facc15" />
          <rect x="40" y="86" width="40" height="16" rx="8" fill="#0284c7" />
        </svg>
      );

    case 'hero-dino':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          className={className}
          aria-label="恐龍探險家"
        >
          <circle cx="60" cy="64" r="40" fill="#d1fae5" />
          <polygon points="44,32 52,18 60,30" fill="#f59e0b" />
          <polygon points="62,30 70,18 78,34" fill="#f59e0b" />
          <ellipse cx="60" cy="68" rx="32" ry="29" fill="#10b981" />
          <ellipse cx="60" cy="80" rx="22" ry="15" fill="#a7f3d0" />
          <circle cx="48" cy="58" r="4.5" fill="#1e293b" />
          <circle cx="72" cy="58" r="4.5" fill="#1e293b" />
          <circle cx="49.5" cy="56.5" r="1.5" fill="#ffffff" />
          <circle cx="73.5" cy="56.5" r="1.5" fill="#ffffff" />
          <path
            d="M48 70 Q60 79 72 70"
            stroke="#064e3b"
            strokeWidth="3.2"
            fill="none"
            strokeLinecap="round"
          />
          <polygon points="53,72 56,77 59,72" fill="#ffffff" />
          <polygon points="63,72 66,77 69,72" fill="#ffffff" />
        </svg>
      );

    case 'hero-knight':
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          className={className}
          aria-label="小勇者"
        >
          <circle cx="60" cy="64" r="40" fill="#fef3c7" />
          <path d="M48 16 Q60 8 72 16 L66 32 H54 Z" fill="#ef4444" />
          <path
            d="M32 58 C32 34, 88 34, 88 58 L88 76 C88 86, 32 86, 32 76 Z"
            fill="#94a3b8"
          />
          <rect x="38" y="48" width="44" height="32" rx="14" fill="#fde68a" />
          <circle cx="50" cy="63" r="4" fill="#1e293b" />
          <circle cx="70" cy="63" r="4" fill="#1e293b" />
          <circle cx="51.2" cy="61.5" r="1.3" fill="#ffffff" />
          <circle cx="71.2" cy="61.5" r="1.3" fill="#ffffff" />
          <circle cx="43" cy="69" r="3.5" fill="#fca5a5" />
          <circle cx="77" cy="69" r="3.5" fill="#fca5a5" />
          <path
            d="M53 72 Q60 78 67 72"
            stroke="#1e293b"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path d="M24 84 L38 78 L38 98 L24 92 Z" fill="#3b82f6" />
          <circle cx="31" cy="88" r="3" fill="#fde047" />
        </svg>
      );
  }
}

interface MonsterSpriteProps {
  monsterId: MonsterId;
  size?: number;
  isHit?: boolean;
  isDefeated?: boolean;
  className?: string;
}

function MonsterFace({
  cx = 60,
  cy = 68,
  isHit,
  isDefeated,
}: {
  cx?: number;
  cy?: number;
  isHit?: boolean;
  isDefeated?: boolean;
}) {
  if (isDefeated) {
    return (
      <g>
        <path
          d={`M${cx - 16} ${cy - 6} L${cx - 8} ${cy + 2} M${cx - 8} ${cy - 6} L${cx - 16} ${cy + 2}`}
          stroke="#1e293b"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d={`M${cx + 8} ${cy - 6} L${cx + 16} ${cy + 2} M${cx + 16} ${cy - 6} L${cx + 8} ${cy + 2}`}
          stroke="#1e293b"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <ellipse cx={cx} cy={cy + 13} rx="6" ry="4" fill="#1e293b" />
      </g>
    );
  }

  if (isHit) {
    return (
      <g>
        <path
          d={`M${cx - 17} ${cy - 6} L${cx - 8} ${cy - 1} L${cx - 17} ${cy + 4}`}
          stroke="#1e293b"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M${cx + 17} ${cy - 6} L${cx + 8} ${cy - 1} L${cx + 17} ${cy + 4}`}
          stroke="#1e293b"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx={cx} cy={cy + 12} rx="7" ry="5" fill="#ef4444" />
      </g>
    );
  }

  return (
    <g>
      <circle cx={cx - 12} cy={cy - 3} r="4.5" fill="#1e293b" />
      <circle cx={cx + 12} cy={cy - 3} r="4.5" fill="#1e293b" />
      <circle cx={cx - 10.5} cy={cy - 4.5} r="1.5" fill="#ffffff" />
      <circle cx={cx + 13.5} cy={cy - 4.5} r="1.5" fill="#ffffff" />
      <path
        d={`M${cx - 9} ${cy + 9} Q${cx} ${cy + 16} ${cx + 9} ${cy + 9}`}
        stroke="#1e293b"
        strokeWidth="3.2"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

export function MonsterSprite({
  monsterId,
  size = 104,
  isHit = false,
  isDefeated = false,
  className = '',
}: MonsterSpriteProps) {
  const opacityClass = isDefeated ? 'opacity-50 grayscale' : '';

  switch (monsterId) {
    case 'mathCube':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          className={`${opacityClass} ${className}`}
          aria-label="魔方算術守衛"
        >
          <rect
            x="22"
            y="24"
            width="76"
            height="76"
            rx="16"
            fill={isHit ? '#fca5a5' : '#6366f1'}
          />
          <rect x="30" y="32" width="60" height="60" rx="12" fill="#818cf8" />
          <text
            x="36"
            y="46"
            fill="#e0e7ff"
            fontSize="14"
            fontWeight="bold"
          >
            + ×
          </text>
          <text
            x="70"
            y="84"
            fill="#e0e7ff"
            fontSize="14"
            fontWeight="bold"
          >
            ÷ =
          </text>
          <MonsterFace cy={64} isHit={isHit} isDefeated={isDefeated} />
        </svg>
      );

    case 'bookSpirit':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          className={`${opacityClass} ${className}`}
          aria-label="迷糊成語書靈"
        >
          <rect
            x="24"
            y="26"
            width="72"
            height="72"
            rx="10"
            fill={isHit ? '#fecaca' : '#f43f5e'}
          />
          <rect x="34" y="34" width="54" height="56" rx="6" fill="#fff1f2" />
          <rect x="24" y="26" width="12" height="72" rx="4" fill="#be123c" />
          <MonsterFace cx={62} cy={63} isHit={isHit} isDefeated={isDefeated} />
        </svg>
      );

    case 'parrotKing':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          className={`${opacityClass} ${className}`}
          aria-label="鸚鵡王"
        >
          <polygon points="44,24 52,10 60,22 68,10 76,24" fill="#facc15" />
          <ellipse
            cx="60"
            cy="64"
            rx="34"
            ry="36"
            fill={isHit ? '#fca5a5' : '#8b5cf6'}
          />
          <ellipse cx="60" cy="70" rx="24" ry="24" fill="#ddd6fe" />
          <polygon points="54,66 66,66 60,78" fill="#f59e0b" />
          <MonsterFace cy={56} isHit={isHit} isDefeated={isDefeated} />
        </svg>
      );

    case 'treeGuardian':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          className={`${opacityClass} ${className}`}
          aria-label="森林樹精長老"
        >
          <circle cx="42" cy="40" r="20" fill="#22c55e" />
          <circle cx="78" cy="40" r="20" fill="#16a34a" />
          <circle cx="60" cy="30" r="22" fill="#4ade80" />
          <rect
            x="38"
            y="46"
            width="44"
            height="54"
            rx="14"
            fill={isHit ? '#fca5a5' : '#a16207'}
          />
          <MonsterFace cy={72} isHit={isHit} isDefeated={isDefeated} />
        </svg>
      );

    case 'flameDragon':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          className={`${opacityClass} ${className}`}
          aria-label="太陽風暴小火龍"
        >
          <polygon points="34,36 42,14 54,32" fill="#facc15" />
          <polygon points="86,36 78,14 66,32" fill="#facc15" />
          <ellipse
            cx="60"
            cy="66"
            rx="36"
            ry="34"
            fill={isHit ? '#fecaca' : '#ea580c'}
          />
          <ellipse cx="60" cy="78" rx="22" ry="18" fill="#fed7aa" />
          <MonsterFace cy={60} isHit={isHit} isDefeated={isDefeated} />
        </svg>
      );

    case 'slime':
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          className={`${opacityClass} ${className}`}
          aria-label="知識史萊姆"
        >
          <path
            d="M20 82 C20 42, 42 26, 60 26 C78 26, 100 42, 100 82 C100 96, 84 100, 60 100 C36 100, 20 96, 20 82 Z"
            fill={isHit ? '#fca5a5' : '#38bdf8'}
          />
          <ellipse cx="44" cy="46" rx="9" ry="5" fill="#bae6fd" opacity="0.8" />
          <MonsterFace cy={68} isHit={isHit} isDefeated={isDefeated} />
        </svg>
      );
  }
}
