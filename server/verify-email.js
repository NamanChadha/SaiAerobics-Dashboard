import dotenv from "dotenv";
import { sendEmail } from "./utils/emailService.js";

dotenv.config();

async function testEmail() {
    console.log("🧪 Starting Resend Verification...");

    if (!process.env.RESEND_API_KEY) {
        console.error("❌ Error: RESEND_API_KEY is not set in environment.");
        process.exit(1);
    }

    try {
        const result = await sendEmail({
            to: "delivered@resend.dev", // Resend's success sink
            subject: "Test - Resend Migration Success",
            html: "<h1>It Works!</h1><p>Your Node.js app is now using Resend.</p>"
        });
        console.log("✅ Verification Successful! Email ID:", result.id);
    } catch (error) {
        console.error("❌ Verification Failed:", error.message);
        process.exit(1);
    }
}

testEmail();
