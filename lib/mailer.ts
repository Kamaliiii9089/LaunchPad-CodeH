import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER, // your email
    pass: process.env.EMAIL_PASS, // app password
  },
});

export async function sendWelcomeEmail(email: string, name: string) {
  await transporter.sendMail({
    from: `"AlgoAI 👋" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Welcome  🚀',
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Hello ${name}, 👋</h2>
        <p>Welcome to <b>AlgoAI</b>!</p>
        <p>Your account has been successfully created.</p>
        <p>Happy coding 💻🔥</p>
        <br/>
        <p>— Team AlgoAI</p>
      </div>
    `,
  });
}
