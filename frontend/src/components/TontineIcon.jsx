export const TontineIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id={`mainGrad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor: '#6366f1'}}/>
        <stop offset="100%" style={{stopColor: '#a855f7'}}/>
      </linearGradient>
      <linearGradient id={`goldGrad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor: '#fbbf24'}}/>
        <stop offset="100%" style={{stopColor: '#f59e0b'}}/>
      </linearGradient>
    </defs>
    
    {/* Background */}
    <rect width="200" height="200" rx="40" fill={`url(#mainGrad-${size})`}/>
    
    {/* Three overlapping coins */}
    {/* Coin 3 (back left) */}
    <circle cx="70" cy="110" r="35" fill="#f59e0b" opacity="0.6"/>
    <circle cx="70" cy="110" r="30" fill={`url(#goldGrad-${size})`}/>
    <circle cx="70" cy="110" r="25" fill="none" stroke="#fbbf24" strokeWidth="2"/>
    <text x="70" y="118" fontFamily="Arial Black, sans-serif" fontSize="20" fontWeight="900" fill="#fff" textAnchor="middle" opacity="0.9">F</text>
    
    {/* Coin 2 (back right) */}
    <circle cx="130" cy="110" r="35" fill="#f59e0b" opacity="0.6"/>
    <circle cx="130" cy="110" r="30" fill={`url(#goldGrad-${size})`}/>
    <circle cx="130" cy="110" r="25" fill="none" stroke="#fbbf24" strokeWidth="2"/>
    <text x="130" y="118" fontFamily="Arial Black, sans-serif" fontSize="20" fontWeight="900" fill="#fff" textAnchor="middle" opacity="0.9">F</text>
    
    {/* Coin 1 (front center) */}
    <circle cx="100" cy="95" r="38" fill="#f59e0b" opacity="0.7"/>
    <circle cx="100" cy="95" r="33" fill={`url(#goldGrad-${size})`}/>
    <circle cx="100" cy="95" r="28" fill="none" stroke="#fbbf24" strokeWidth="2.5"/>
    <text x="100" y="104" fontFamily="Arial Black, sans-serif" fontSize="24" fontWeight="900" fill="#fff" textAnchor="middle">F</text>
    
    {/* Three people silhouettes at top */}
    {/* Left person */}
    <circle cx="60" cy="45" r="12" fill="#fff"/>
    <path d="M60 58 Q50 70 52 75 L68 75 Q70 70 60 58" fill="#fff"/>
    
    {/* Center person */}
    <circle cx="100" cy="35" r="14" fill="#fff"/>
    <path d="M100 50 Q88 64 90 70 L110 70 Q112 64 100 50" fill="#fff"/>
    
    {/* Right person */}
    <circle cx="140" cy="45" r="12" fill="#fff"/>
    <path d="M140 58 Q130 70 132 75 L148 75 Q150 70 140 58" fill="#fff"/>
    
    {/* Hands/arrows pointing down to coins */}
    <path d="M100 72 L100 60" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
    <path d="M100 72 L95 67 M100 72 L105 67" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
    
    {/* Text at bottom */}
    <text x="100" y="165" fontFamily="Arial Black, sans-serif" fontSize="32" fontWeight="900" fill="#fff" textAnchor="middle">IK</text>
  </svg>
);
