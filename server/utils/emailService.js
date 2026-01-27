import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an email using Resend API
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML content
 * @returns {Promise<Object>} Resend API response
 */
export async function sendEmail({ to, subject, html }) {
    if (!process.env.RESEND_API_KEY) {
        console.error("❌ RESEND_API_KEY is missing via sendEmail utility.");
        throw new Error("Resend API Key missing");
    }

    // Use configured sender or fallback to onboarding
    // Note: Onboarding only works if 'to' is also the account owner email
    const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    try {
        const { data, error } = await resend.emails.send({
            from: `Sai Aerobics <${from}>`,
            to,
            subject,
            html
        });

        if (error) {
            console.error("❌ Resend API Error:", error);
            throw new Error(`Email failed: ${error.message}`);
        }

        console.log(`✅ Email sent to ${to}. ID: ${data.id}`);
        return data;
    } catch (err) {
        console.error("❌ sendEmail Exception:", err.message);
        throw err;
    }
}
