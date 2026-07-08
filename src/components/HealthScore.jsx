const HealthScore = ({ score }) => {
    // Determine color based on score
    let color = '#22c55e';
    if (score < 80) color = '#f59e0b';
    if (score < 50) color = '#f87171';
    const trackColor = 'rgba(255, 255, 255, 0.12)';

    // Calculate circumference for stroke-dasharray (r=45, C ~ 282)
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const progress = ((100 - score) / 100) * circumference;

    return (
        <div style={{ position: 'relative', width: '140px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Background Circle */}
            <svg width="140" height="140" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                    cx="50" cy="50" r={radius}
                    fill="transparent"
                    stroke={trackColor}
                    strokeWidth="8"
                />
                {/* Progress Circle */}
                <circle
                    cx="50" cy="50" r={radius}
                    fill="transparent"
                    stroke={color}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={progress}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease-in-out, stroke 1s ease' }}
                />
            </svg>

            {/* Center Text */}
            <div style={{ position: 'absolute', textAlign: 'center' }}>
                <div style={{ fontSize: '2.4rem', fontWeight: '800', color: color, textShadow: `0 0 12px ${color}` }}>
                    {score}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Sys Health
                </div>
            </div>
        </div>
    );
};

export default HealthScore;
