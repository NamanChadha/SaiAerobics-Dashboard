import { useRef, useMemo } from "react";

export default function ProgressChart({ weights }) {
    // 1. Validate & Parse Data
    const data = useMemo(() => {
        if (!weights || weights.length === 0) return [];
        // Clone and sort by date Ascending (Old -> New)
        // Parse weight to float just in case
        return [...weights]
            .map(w => ({
                ...w,
                val: parseFloat(w.weight),
                dateObj: new Date(w.created_at || w.log_date)
            }))
            .sort((a, b) => a.dateObj - b.dateObj)
            .slice(-15); // Show last 15 points for clarity
    }, [weights]);


    if (data.length === 0) {
        return (
            <div className="card" style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
                <h3>Weight Progress</h3>
                <p>No logs yet. Start tracking! 📉</p>
            </div>
        );
    }

    // 2. Dimensions & Scales
    const width = 300;
    const height = 180;
    const padding = 30; // Space for labels

    // Y Axis Range
    const values = data.map(d => d.val);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    // Add buffer
    const buffer = (maxVal - minVal) === 0 ? 5 : (maxVal - minVal) * 0.1;
    const yMin = Math.floor(minVal - buffer);
    const yMax = Math.ceil(maxVal + buffer);

    const getX = (i) => padding + (i * ((width - padding * 2) / (data.length - 1 || 1)));
    const getY = (v) => height - padding - ((v - yMin) / (yMax - yMin)) * (height - padding * 2);

    // 3. Generate Path
    const points = data.map((d, i) => `${getX(i)},${getY(d.val)}`).join(" ");

    return (
        <div className="graph-container" style={{ position: "relative" }}>
            <h3>Weight Progress</h3>
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
                <defs>
                    <linearGradient id="lineGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary-purple)" />
                        <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                </defs>

                {/* Y Axis Grid & Labels */}
                {[yMin, (yMin + yMax) / 2, yMax].map((val, i) => {
                    const y = getY(val);
                    return (
                        <g key={i}>
                            <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.1)" strokeDasharray="3" />
                            <text x={padding - 5} y={y + 3} fill="var(--text-muted)" fontSize="10" textAnchor="end">
                                {val.toFixed(0)}
                            </text>
                        </g>
                    )
                })}

                {/* X Axis Labels (First and Last Date) */}
                <text x={padding} y={height - 10} fill="var(--text-muted)" fontSize="10" textAnchor="middle">
                    {data[0]?.date_str?.slice(5) || ""}
                </text>
                <text x={width - padding} y={height - 10} fill="var(--text-muted)" fontSize="10" textAnchor="middle">
                    {data[data.length - 1]?.date_str?.slice(5) || ""}
                </text>

                {/* Line */}
                <polyline
                    fill="none"
                    stroke="url(#lineGrad)"
                    strokeWidth="3"
                    points={points}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Interactive Dots & Values */}
                {data.map((d, i) => (
                    <g key={i}>
                        <circle cx={getX(i)} cy={getY(d.val)} r="4" fill="#1e293b" stroke="var(--primary-purple)" strokeWidth="2" />
                        {/* Only show value for last point or if distinct */}
                        {(i === data.length - 1) && (
                            <text x={getX(i)} y={getY(d.val) - 10} fill="#fff" fontSize="11" fontWeight="bold" textAnchor="middle">
                                {d.val}
                            </text>
                        )}
                    </g>
                ))}
            </svg>
        </div>
    );
}
