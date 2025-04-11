import { inngest } from "~/inngest/client";
import invariant from "tiny-invariant";
// Import Resend and the email component
import { Resend } from 'resend';
import PaydayReminderEmail from "~/emails/PaydayReminderEmail";

// Ensure Resend API Key is set
invariant(process.env.RESEND_API_KEY, "RESEND_API_KEY environment variable not set.");
const resend = new Resend(process.env.RESEND_API_KEY);

// Ensure From address is set
invariant(process.env.EMAIL_FROM_ADDRESS, "EMAIL_FROM_ADDRESS environment variable not set (e.g., noreply@yourdomain.com)");
const fromAddress = process.env.EMAIL_FROM_ADDRESS;

// Define the expected payload structure from the invoking function
interface SendNotificationPayload {
  userId: string;
  userEmail: string | null;
  targetAmount: number | null;
  payday: string; // ISO string format
}

export const sendPaydayNotification = inngest.createFunction(
  { id: "send-payday-notification", name: "Send Payday Notification" },
  { event: "inngest/function.invoked" },
  async ({ event, step }) => {
    const payload = event.data.data as SendNotificationPayload;

    if (!payload || !payload.userEmail || !payload.userId) {
        console.error("Invalid payload received for sending notification:", payload);
        await step.run("log-invalid-payload", async () => {
             console.error(`Invalid payload for user ${payload?.userId}: ${JSON.stringify(payload)}`);
        });
        // Use throwError to mark the step/run as failed explicitly in Inngest
        throw new Error("Invalid payload received"); 
    }

    const { userId, userEmail, targetAmount, payday } = payload;

    console.log(`Attempting to send notification to user ${userId} (${userEmail}).`);

    // Send email using Resend
    await step.run("send-email-via-resend", async () => {
      try {
        const { data, error } = await resend.emails.send({
          from: fromAddress, // Use the from address from env
          to: userEmail,     // Recipient email from payload
          subject: "Your Smoothed Payday Reminder",
          // Pass the React component and its props
          react: PaydayReminderEmail({ 
            userEmail: userEmail,
            targetAmount: targetAmount,
            payday: payday,
            // You could generate a real URL here if needed
            // paydayUrl: `https://yourapp.com/schedule` 
          }),
        });

        if (error) {
          console.error(`Resend API error sending email to ${userEmail}:`, error);
          // Throw error to make the Inngest step fail
          throw new Error(`Resend API Error: ${error.message}`); 
        }

        console.log(`Successfully sent email via Resend, ID: ${data?.id} to ${userEmail}`);
        return { success: true, emailId: data?.id, emailSentTo: userEmail };

      } catch (e: unknown) {
          console.error(`Error in Resend step for ${userEmail}:`, e);
          // Re-throw to ensure the step fails
          if (e instanceof Error) {
              throw new Error(`Failed to send email: ${e.message}`);
          } else {
              throw new Error(`Failed to send email due to unknown error.`);
          }
      }
    });

    return {
      message: `Notification email sent successfully to user ${userId}.`,
      details: {
        userId: userId,
        email: userEmail,
      }
    };
  }
); 