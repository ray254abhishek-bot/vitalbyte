const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    // Check if SMTP credentials are provided
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.createRealTransporter();
    } else {
      console.log('\n⚠️ No SMTP credentials found. Email sending will not work.');
      console.log('Please configure SMTP_USER and SMTP_PASS in .env file\n');
    }
  }

  createRealTransporter() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('\n❌ Email service connection failed:');
        console.error(error.message);
        console.log('\nPlease check your SMTP credentials in .env file\n');
      } else {
        console.log('\n✅ Email service configured successfully!');
        console.log(`📧 Sending emails from: ${process.env.SMTP_USER}\n`);
      }
    });
  }

  async sendEmail(to, subject, html) {
    if (!this.transporter) {
      console.error('Email transporter not initialized');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"VitalByte Health" <${process.env.SMTP_USER}>`,
        to: to,
        subject: subject,
        html: html,
      });

      console.log(`✅ Email sent to: ${to}`);
      console.log(`   Message ID: ${info.messageId}`);
      
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('❌ Email send error:', err.message);
      return { success: false, error: err.message };
    }
  }

  async sendVerificationEmail(email, otp, name) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #00c2ff 0%, #00ff9d 100%);
            padding: 30px;
            text-align: center;
            border-radius: 15px 15px 0 0;
          }
          .header h1 {
            color: #04080f;
            margin: 0;
            font-size: 28px;
          }
          .header p {
            color: #04080f;
            margin: 5px 0 0;
            opacity: 0.9;
          }
          .content {
            background: #ffffff;
            padding: 40px 30px;
            border-radius: 0 0 15px 15px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .otp-box {
            background: #f5f7fa;
            border: 2px dashed #00c2ff;
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            margin: 25px 0;
          }
          .otp-code {
            font-size: 42px;
            font-weight: bold;
            color: #00c2ff;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background: #00c2ff;
            color: #04080f;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #eee;
            margin-top: 20px;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 12px 15px;
            margin: 20px 0;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💊 VitalByte</h1>
            <p>Digital Health Records</p>
          </div>
          <div class="content">
            <h2>Hello ${name || 'Valued User'}! 👋</h2>
            <p>Thank you for choosing VitalByte. Please verify your email address to complete your registration.</p>
            
            <div class="otp-box">
              <div style="font-size: 14px; color: #666; margin-bottom: 10px;">Your Verification Code</div>
              <div class="otp-code">${otp}</div>
              <div style="font-size: 12px; color: #666; margin-top: 10px;">Valid for 10 minutes</div>
            </div>
            
            <div class="warning">
              ⚠️ <strong>Security Notice:</strong> Never share this OTP with anyone. VitalByte will never ask for this code outside of this verification process.
            </div>
            
            <p>If you didn't create an account with VitalByte, please ignore this email.</p>
            
            <hr style="margin: 25px 0; border: none; border-top: 1px solid #eee;" />
            
            <p style="font-size: 12px; color: #666;">
              Need help? Contact our support team at <a href="mailto:support@vitalbyte.com">support@vitalbyte.com</a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; 2024 VitalByte Health Records. All rights reserved.</p>
            <p>Secure & Encrypted Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, '🔐 Verify Your Email Address - VitalByte', html);
  }

  async sendPasswordResetEmail(email, resetLink, name) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #00c2ff, #00ff9d); padding: 30px; text-align: center; border-radius: 15px 15px 0 0; }
          .content { background: #ffffff; padding: 40px 30px; border-radius: 0 0 15px 15px; }
          .button { display: inline-block; padding: 12px 30px; background: #00c2ff; color: #04080f; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .link-box { background: #f5f7fa; padding: 15px; border-radius: 8px; word-break: break-all; font-family: monospace; font-size: 12px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: #04080f;">🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${name || 'User'},</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <div class="link-box">${resetLink}</div>
            
            <p><strong>This link will expire in 1 hour.</strong></p>
            
            <p>If you didn't request this, please ignore this email or <a href="mailto:support@vitalbyte.com">contact support</a>.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 VitalByte. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, 'Reset Your Password - VitalByte', html);
  }

  async sendPasswordResetSuccessEmail(email, name) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #00ff9d, #00c2ff); padding: 30px; text-align: center; border-radius: 15px 15px 0 0; }
          .content { background: #ffffff; padding: 40px 30px; border-radius: 0 0 15px 15px; }
          .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: #04080f;">✅ Password Changed Successfully</h1>
          </div>
          <div class="content">
            <div class="success-icon">🔒</div>
            <h2>Hello ${name || 'User'},</h2>
            <p>Your password has been successfully changed.</p>
            <p>If you did not make this change, please <strong>contact support immediately</strong> at support@vitalbyte.com</p>
            <p>For added security, we recommend enabling two-factor authentication in your account settings.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 VitalByte. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, 'Password Changed Successfully - VitalByte', html);
  }
}

module.exports = new EmailService();