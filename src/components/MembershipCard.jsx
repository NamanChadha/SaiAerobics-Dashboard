import "../styles/dashboard.css";

const TIER_STYLES = {
    silver: {
        background: "linear-gradient(135deg, #8e9eab, #eef2f3)", // Metallic Silver
        color: "#333",
        boxShadow: "0 8px 20px rgba(0,0,0,0.1)"
    },
    gold: {
        background: "linear-gradient(135deg, #FFD700, #FDB931)", // Shiny Gold
        color: "#4a3c04",
        border: "1px solid rgba(255, 215, 0, 0.5)",
        boxShadow: "0 10px 25px rgba(253, 185, 49, 0.4)" // Glowing Gold Shadow
    },
    platinum: {
        background: "linear-gradient(135deg, #e0e0e0, #909090, #303030)", // Deep Platinum
        color: "#fff",
        boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
    }
};

export default function MembershipCard({ tier, batchTime, daysLeft }) {
    const isExpired = daysLeft <= 0;
    const maxDays = tier === 'gold' ? 90 : tier === 'platinum' ? 365 : 30;
    const progress = Math.min(100, Math.max(0, (daysLeft / maxDays) * 100));

    // Default to a fallback if tier is unknown
    const tierKey = (tier || 'silver').toLowerCase();
    const style = TIER_STYLES[tierKey] || TIER_STYLES.silver;

    return (
        <div className={`membership-card ${isExpired ? 'expired' : ''}`} style={!isExpired ? style : {}}>
            <div className="card-header-row">
                <span className="tier-badge" style={{
                    background: "rgba(255,255,255,0.3)",
                    color: "inherit",
                    backdropFilter: "blur(5px)"
                }}>
                    {tier === 'silver' ? '1-Month Plan' : tier.charAt(0).toUpperCase() + tier.slice(1)} • {batchTime} Batch
                </span>
            </div>

            <div className="days-display" style={{ color: "inherit" }}>
                {isExpired ? (
                    <h1 className="expired-text">Membership Expired</h1>
                ) : (
                    <h1>{daysLeft} <span className="label" style={{ opacity: 0.8, color: "inherit" }}>days left</span></h1>
                )}
            </div>

            <div className="progress-bar-container" style={{ background: "rgba(255,255,255,0.3)" }}>
                <div
                    className="progress-fill"
                    style={{
                        width: `${progress}%`,
                        background: isExpired ? '#ef4444' : (tierKey === 'platinum' ? '#fff' : '#fff')
                    }}
                />
            </div>

            {isExpired && <p className="renew-hint">Please contact admin to renew.</p>}
        </div>
    );
}
