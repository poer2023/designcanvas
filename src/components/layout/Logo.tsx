export default function Logo({ className = "", size = 32 }: { className?: string, size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <rect x="4" y="4" width="24" height="24" rx="6" fill="url(#logo-gradient)" />
            <path
                d="M16 4V28M4 16H28"
                stroke="white"
                strokeOpacity="0.2"
                strokeWidth="1"
                strokeLinecap="round"
            />
            <circle cx="16" cy="16" r="5" fill="white" fillOpacity="0.9" />
            <path
                d="M21 11L11 21"
                stroke="url(#logo-accent)"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <circle cx="21" cy="11" r="2" fill="white" />
            <defs>
                <linearGradient id="logo-gradient" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3B82F6" />
                    <stop offset="1" stopColor="#8B5CF6" />
                </linearGradient>
                <linearGradient id="logo-accent" x1="11" y1="11" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#F472B6" />
                    <stop offset="1" stopColor="#EC4899" />
                </linearGradient>
            </defs>
        </svg>
    );
}
