import axios from 'axios';
import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

// Configuration
const NICHES = ["prop firm reviews", "best forex trading journals", "trading psychology blogs"];

interface Lead {
    site: string;
    email: string;
}

/**
 * Simplified lead scraper. 
 * In a real production environment, this would use a SERP API or a robust HTML parser.
 */
async function scrapeLeads(query: string): Promise<Lead[]> {
    console.log(`Searching for leads in niche: ${query}`);

    // Placeholder logic for demonstration
    const leads: Lead[] = [
        { site: "ForexEdge.com", email: "editor@forexedge.com" },
        { site: "PropFirmSecrets.net", email: "contact@propfirmsecrets.net" },
        { site: "EliteTraderHub.org", email: "partners@elitetraderhub.org" }
    ];

    return leads;
}

/**
 * Generates a personalized outreach email.
 */
function generateEmail(siteName: string): string {
    return `
Hi ${siteName} Team,

I'm reaching out from Tradia AI (tradiaai.app). I've been following your insights on the trading community and really value the perspective you bring to retail traders.

We've recently launched an AI-powered trading journal specifically designed for Forex and Prop Firm traders. Unlike legacy tools like Edgewonk or TraderSync, Tradia automates psychology tracking and real-time compliance monitoring—removing the friction of manual journaling.

I'd love to discuss a potential feature, guest post, or comparison piece for your audience. We're also happy to provide an extended 30-day free trial for your readers.

Would you be open to a quick chat or a demo?

Best regards,
Tradia Growth Team
  `;
}

/**
 * Sends outreach emails via Nodemailer.
 */
async function sendEmail(lead: Lead, content: string) {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    try {
        // In actual production, uncomment the following line:
        // await transporter.sendMail({
        //   from: '"Tradia Growth" <growth@tradiaai.app>',
        //   to: lead.email,
        //   subject: `Partnership Opportunity: ${lead.site} x Tradia AI`,
        //   text: content,
        // });
        console.log(`[DRY RUN] Sent email to ${lead.email}`);
    } catch (error) {
        console.error(`Failed to send email to ${lead.email}:`, error);
    }
}

/**
 * Main execution loop.
 */
async function runOutreach() {
    console.log("Starting Tradia AI Backlink Outreach Automation...");

    for (const niche of NICHES) {
        const leads = await scrapeLeads(niche);

        for (const lead of leads) {
            const emailContent = generateEmail(lead.site);
            await sendEmail(lead, emailContent);
            // Wait to avoid spam filters
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    console.log("Outreach cycle completed.");
}

// Execute if run directly
if (require.main === module) {
    runOutreach().catch(console.error);
}

export { runOutreach, scrapeLeads, generateEmail };
