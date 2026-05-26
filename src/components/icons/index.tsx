const defaultSize = 24;
type IconProps = { size?: number; className?: string };

export function HeadbandIcon({ size = defaultSize, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 11c0-4 4-7 9-7s9 3 9 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M2 12.5h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M15 8.5l2.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M16.5 7l1.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function ScrollIcon({ size = defaultSize, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M8 3a2 2 0 00-2 2v1H5a2 2 0 00-2 2v10a2 2 0 002 2h1v1a2 2 0 002 2h11a2 2 0 002-2V9a2 2 0 00-2-2h-1V5a2 2 0 00-2-2H8z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M9 10h6M9 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="6" cy="8" r="1.5" fill="currentColor" opacity="0.3"/>
      <circle cx="18" cy="18" r="1.5" fill="currentColor" opacity="0.3"/>
    </svg>
  );
}

// Keep FlameIcon as an alias for backward compat in tests/etc
export function FlameIcon({ size = defaultSize, className = "" }: IconProps) {
  return <HeadbandIcon size={size} className={className} />;
}

export function BoneIcon({ size = defaultSize, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M4.5 4a2.5 2.5 0 014.3 1.7l6.5 6.5A2.5 2.5 0 0120 11a2.5 2.5 0 01.5 5 2.5 2.5 0 01-4.3 1.3l-6.5-6.5A2.5 2.5 0 014 13a2.5 2.5 0 01-.5-5A2.5 2.5 0 014.5 4z" />
    </svg>
  );
}

// Keep BoltIcon as alias for backward compat
export function BoltIcon({ size = defaultSize, className = "" }: IconProps) {
  return <BoneIcon size={size} className={className} />;
}

export function HomeIcon({ size = defaultSize, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 12L12 3l9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function RepeatIcon({ size = defaultSize, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M17 1l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 11V9a4 4 0 014-4h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 23l-4-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 13v2a4 4 0 01-4 4H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function ChartIcon({ size = defaultSize, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="12" width="4" height="9" rx="1" fill="currentColor" opacity="0.4"/>
      <rect x="10" y="7" width="4" height="14" rx="1" fill="currentColor" opacity="0.7"/>
      <rect x="17" y="3" width="4" height="18" rx="1" fill="currentColor"/>
    </svg>
  );
}

export function UserIcon({ size = defaultSize, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
      <path d="M4 21v-1a6 6 0 0112 0v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function TrophyIcon({ size = defaultSize, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M8 21h8m-4-4v4m-5-8c-2.5 0-4-1.5-4-4V5h4m10 4c2.5 0 4 1.5 4 4v0c0 2.5-1.5 4-4 4m0-8V5h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 5h10v6a5 5 0 01-10 0V5z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

export function LockIcon({ size = defaultSize, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function CheckIcon({ size = defaultSize, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function StarIcon({ size = defaultSize, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PawIcon({ size = defaultSize, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <ellipse cx="8.5" cy="5.5" rx="2.2" ry="2.8" />
      <ellipse cx="15.5" cy="5.5" rx="2.2" ry="2.8" />
      <ellipse cx="5" cy="12" rx="1.8" ry="2.3" />
      <ellipse cx="19" cy="12" rx="1.8" ry="2.3" />
      <path d="M12 22c-2.8 0-5.2-2.3-5.7-4.7-.3-1.4.4-2.8 1.8-3.3.9-.3 2.4-.5 3.9-.5s3 .2 3.9.5c1.4.5 2.1 1.9 1.8 3.3-.5 2.4-2.9 4.7-5.7 4.7z" />
    </svg>
  );
}

export function SnowflakeIcon({ size = defaultSize, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3"/>
    </svg>
  );
}

export function ChevronRightIcon({ size = defaultSize, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function ArrowLeftIcon({ size = defaultSize, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
