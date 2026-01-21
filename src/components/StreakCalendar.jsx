export default function StreakCalendar({ streakDates }) {
    // streakDates: array of strings "YYYY-MM-DD"
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Helper to check if a day is active
    const isActive = (day) => {
        const d = day.toString().padStart(2, '0');
        const m = (month + 1).toString().padStart(2, '0');
        const dateStr = `${year}-${m}-${d}`;
        return streakDates.includes(dateStr);
    };

    const grids = [];
    // Empty slots for start of month
    for (let i = 0; i < firstDay; i++) {
        grids.push(<div key={`empty-${i}`} className="cal-day empty"></div>);
    }
    const todayDay = new Date().getDate(); // 1-31

    for (let d = 1; d <= daysInMonth; d++) {
        let content = d;
        let className = "cal-day";

        if (isActive(d)) {
            content = "🔥";
            className += " active";
        } else if (d < todayDay) {
            // Missed day (in the past)
            content = "☹️";
            className += " missed"; // You can add styling for .missed if needed, or just let it inherit
        }

        grids.push(
            <div key={d} className={className}>
                {content}
            </div>
        );
    }

    return (
        <div className="streak-calendar">
            <h3>Attendance ({monthNames[month]})</h3>
            <div className="cal-grid">
                <div className="cal-head">S</div>
                <div className="cal-head">M</div>
                <div className="cal-head">T</div>
                <div className="cal-head">W</div>
                <div className="cal-head">T</div>
                <div className="cal-head">F</div>
                <div className="cal-head">S</div>
                {grids}
            </div>

            <div className="cal-legend">
                <div className="legend-item">
                    <span>🔥</span> <span>Present</span>
                </div>
                <div className="legend-item">
                    <span>☹️</span> <span>Missed</span>
                </div>
            </div>
        </div>
    );
}
