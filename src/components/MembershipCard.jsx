import "../styles/dashboard.css";

const TIER_LABELS = {
    silver: "1-Month Plan",
    gold: "3-Month Plan",
    platinum: "Personal Training"
};

const TIER_COLORS = {
    silver: "linear-gradient(135deg, #bdc3c7, #2c3e50)",
    gold: "linear-gradient(135deg, #f1c40f, #f39c12)",
    platinum: "linear-gradient(135deg, #e0e0e0, #7f8c8d)"
};

export default function MembershipCard({ tier, batchTime, daysLeft }) {
    const isExpired = daysLeft <= 0;
    const maxDays = tier === 'gold' ? 90 : tier === 'platinum' ? 365 : 30; // approx
    const progress = Math.min(100, Math.max(0, (daysLeft / maxDays) * 100));

    return (
        <div className={`membership-card ${isExpired ? 'expired' : ''}`}>
            <div className="card-header-row">
                <span className="tier-badge">{tier === 'silver' ? '1-Month Plan' : tier} • {batchTime} Batch</span>
            </div>

            <div className="days-display">
                {isExpired ? (
                    <h1 className="expired-text">Membership Expired</h1>
                ) : (
                    <h1>{daysLeft} <span className="label">days left</span></h1>
                )}
            </div>

            <div className="progress-bar-container">
                <div
                    className="progress-fill"
                    style={{ width: `${progress}%`, background: isExpired ? '#ef4444' : 'white' }}
                />
            </div>

            {isExpired && <p className="renew-hint">Please contact admin to renew.</p>}
        </div>
    );
}
