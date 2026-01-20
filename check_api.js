async function check() {
    try {
        const res = await fetch("http://localhost:5000/");
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Response:", text);
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}
check();
