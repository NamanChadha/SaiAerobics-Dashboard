import "../styles/dashboard.css";

// Use brand-consistent colors
const TIER_STYLES = {
    silver: {
        background: "linear-gradient(135deg, var(--primary) 0%, #f687a5 100%)",
        color: "#fff",
        boxShadow: "0 10px 30px rgba(232, 93, 117, 0.3)"
    },
    gold: {
        background: "linear-gradient(135deg, #f59e0b, #d97706)",
        color: "#fff",
        boxShadow: "0 10px 25px rgba(245, 158, 11, 0.3)"
    },
    platinum: {
        background: "linear-gradient(135deg, #374151, #111827)",
        color: "#fff",
        boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
    }
};

export default function MembershipCard({ tier, batchTime, daysLeft }) {
    const isExpired = daysLeft <= 0;
    const maxDays = tier === 'gold' ? 90 : tier === 'platinum' ? 365 : 30;
    const progress = Math.min(100, Math.max(0, (daysLeft / maxDays) * 100));

    const tierKey = (tier || 'silver').toLowerCase();
    const style = TIER_STYLES[tierKey] || TIER_STYLES.silver;

    return (
        <div
            className="membership-card"
            style={!isExpired ? {
                ...style,
                borderRadius: "24px",
                padding: "25px",
                marginBottom: "25px"
            } : {
                background: "linear-gradient(135deg, #f87171, #dc2626)",
                borderRadius: "24px",
                padding: "25px",
                marginBottom: "25px",
                color: "#fff"
            }}
        >
            <div className="card-header-row" style={{ marginBottom: "15px" }}>
                <span style={{
                    background: "rgba(255,255,255,0.2)",
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    backdropFilter: "blur(5px)"
                }}>
                    {tier === 'silver' ? '1-Month Plan' : tier.charAt(0).toUpperCase() + tier.slice(1)} • {batchTime} Batch
                </span>
            </div>

            <div style={{ textAlign: "center", margin: "20px 0" }}>
                {isExpired ? (
                    <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Membership Expired</h2>
                ) : (
                    <>
                        <h1 style={{ margin: 0, fontSize: "3rem", fontWeight: "800" }}>{daysLeft}</h1>
                        <span style={{ opacity: 0.9, fontSize: "1rem" }}>days left</span>
                    </>
                )}
            </div>

            <div style={{
                height: "6px",
                background: "rgba(255,255,255,0.3)",
                borderRadius: "10px",
                overflow: "hidden"
            }}>
                <div style={{
                    width: `${progress}%`,
                    height: "100%",
                    background: "#fff",
                    borderRadius: "10px",
                    transition: "width 0.5s ease"
                }} />
            </div>

            {isExpired && (
                <p style={{ textAlign: "center", marginTop: "15px", fontSize: "0.9rem", opacity: 0.9 }}>
                    Please contact admin to renew.
                </p>
            )}
        </div>
    );
}
