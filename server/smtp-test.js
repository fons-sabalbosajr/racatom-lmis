// smtp-test.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

async function testSMTP() {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false, // avoid cert issues
    },
  });

  // Verify connection configuration
  transporter.verify((err, success) => {
    if (err) {
      console.error("SMTP verification failed:", err);
    } else {
      console.log("✅ SMTP server is ready to send emails");
    }
  });

  // Send a test email
  try {
    const info = await transporter.sendMail({
      from: `"RCT Test" <${process.env.EMAIL_USER}>`,
      to: "your-personal-email@gmail.com", // replace with your own email
      subject: "SMTP Test Email",
      text: "This is a test email from NodeMailer.",
    });

    console.log("✅ Test email sent:", info.response);
  } catch (err) {
    console.error("❌ Failed to send test email:", err);
  }
}

testSMTP();
