

const API_URL = "http://localhost:5000";

async function testAPI() {
    console.log("🔍 Starting API Diagnosis...");

    try {
        // 1. Login to get token
        console.log("👉 Logging in...");
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // Using the admin credentials I saw in server.js or a test user
            body: JSON.stringify({ email: "namanchadhajii147@gmail.com", password: "Omsairam147@" })
        });

        if (!loginRes.ok) throw new Error(`Login Failed: ${loginRes.status} ${loginRes.statusText}`);
        const loginData = await loginRes.json();
        console.log("✅ Login Successful. Token received.");
        const token = loginData.token;

        // 2. Fetch Dashboard
        console.log("👉 Fetching Dashboard...");
        const dashRes = await fetch(`${API_URL}/dashboard`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const dashText = await dashRes.text();
        if (!dashRes.ok) {
            console.error("❌ Dashboard Failed:", dashRes.status, dashText);
        } else {
            console.log("✅ Dashboard OK. Data length:", dashText.length);
            console.log("Preview:", dashText.substring(0, 100)); // Log first 100 chars
        }

        // 3. Mark Attendance
        console.log("👉 Marking Attendance...");
        const attRes = await fetch(`${API_URL}/attendance`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const attText = await attRes.text();
        if (!attRes.ok) {
            console.error("❌ Attendance Failed:", attRes.status, attText);
        } else {
            console.log("✅ Attendance Marker OK:", attText);
        }

        // 4. Verify Persistence
        console.log("👉 Verifying persistence...");
        const verifyRes = await fetch(`${API_URL}/dashboard`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const verifyData = await verifyRes.json();
        console.log("Streak Dates:", JSON.stringify(verifyData.streakDates));

        // Check if today matches
        const today = new Date().toISOString().split('T')[0];
        if (verifyData.streakDates.includes(today)) {
            console.log("✅ SUCCESS: Attendance persisted and verified!");
        } else {
            console.error("❌ FAILURE: Attendance not found in dashboard data!");
        }

    } catch (err) {
        console.error("💥 Fatal Error:", err.message);
    }
}

testAPI();
