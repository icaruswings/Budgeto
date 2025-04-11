import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Link,
  Tailwind, // Optional: If using Tailwind CSS
} from "@react-email/components";

// Define the props the email component will accept
interface PaydayReminderEmailProps {
  userEmail?: string; // Optional, for personalization if available
  targetAmount?: number | null;
  payday?: string; // Should be a pre-formatted date string
  paydayUrl?: string; // Optional link to the schedule page
}

// Helper to format currency (consider moving to a shared util if used elsewhere)
function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "N/A";
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
}

// Helper to format date string (consider moving to a shared util)
function formatDisplayDate(isoString: string | null | undefined): string {
    if (!isoString) return "an upcoming date";
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return "an upcoming date";
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    } catch (e) {
        return "an upcoming date";
    }
}

const PaydayReminderEmail = ({
  userEmail,
  targetAmount,
  payday,
  paydayUrl = "#", // Default link if none provided
}: PaydayReminderEmailProps) => {
  const previewText = `Your smoothed payday is approaching!`;
  const formattedAmount = formatCurrency(targetAmount);
  const formattedDate = formatDisplayDate(payday);

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
       {/* Optional: Wrap with Tailwind for utility classes */}
      <Tailwind>
        <Body style={main}>
          <Container style={container}>
            <Heading style={h1}>Your Smoothed Payday is Approaching!</Heading>
            <Text style={text}>
              Hi{userEmail ? ` ${userEmail.split('@')[0]}` : ' there'},
            </Text>
            <Text style={text}>
              Just a friendly reminder that your next smoothed payment of approximately{" "}
              <strong>{formattedAmount}</strong> is scheduled for{" "}
              <strong>{formattedDate}</strong>.
            </Text>
            <Text style={text}>
              Make sure your primary account has sufficient funds available for a smooth transfer.
            </Text>
            {paydayUrl !== "#" && (
               <Text style={text}>
                 You can view your full schedule here:
                 <br />
                 <Link href={paydayUrl} style={link}>
                   {paydayUrl}
                 </Link>
               </Text>
            )}
             <Text style={footer}>PayCycle Smoother</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default PaydayReminderEmail;

// Basic styles (inline for compatibility)
const main = {
  backgroundColor: "#ffffff",
  fontFamily: 'HelveticaNeue,Helvetica,Arial,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #eee",
  borderRadius: "5px",
  boxShadow: "0 5px 10px rgba(20, 50, 70, 0.2)",
  marginTop: "20px",
  maxWidth: "360px",
  margin: "0 auto",
  padding: "20px 0 48px",
  width: "100%",
};

const h1 = {
  color: "#333",
  fontSize: "20px",
  fontWeight: "bold",
  marginBottom: "15px",
  padding: "0 20px",
};

const text = {
  color: "#333",
  fontSize: "14px",
  margin: "10px 0",
  padding: "0 20px",
  lineHeight: "1.5",
};

const link = {
  color: "#067df7",
  textDecoration: "none",
};

const footer = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    padding: "0 20px",
    marginTop: "20px",
}; 