const { OTP } = require('../models');
const emailService = require('./emailService');

class OTPService {
  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static async sendEmailOTP(email, type, userId = null) {
    try {
      const otp = this.generateOTP();
      const expires_at = new Date(Date.now() + 10 * 60 * 1000);
      
      // Delete old unused OTPs
      await OTP.deleteMany({ email: email.toLowerCase(), type, used: false });
      
      // Create new OTP
      await OTP.create({
        email: email.toLowerCase(),
        otp,
        type,
        expires_at,
        used: false,
        attempts: 0,
      });
      
      console.log(`📧 OTP generated for ${email}: ${otp}`);
      
      // Get user name if userId provided
      let userName = null;
      if (userId) {
        const { User } = require('../models');
        const user = await User.findById(userId);
        userName = user?.name;
      }
      
      // Send email
      const emailResult = await emailService.sendVerificationEmail(email, otp, userName);
      
      if (!emailResult.success) {
        throw new Error('Failed to send verification email');
      }
      
      console.log(`✅ Verification email sent to ${email}`);
      return { success: true };
    } catch (err) {
      console.error('❌ Error in sendEmailOTP:', err.message);
      throw err;
    }
  }

  static async sendMobileOTP(phone, type) {
    const otp = this.generateOTP();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000);
    
    await OTP.deleteMany({ phone, type, used: false });
    
    await OTP.create({
      phone,
      otp,
      type,
      expires_at,
      used: false,
      attempts: 0,
    });
    
    console.log(`📱 Mobile OTP for ${phone}: ${otp}`);
    
    // TODO: Integrate with SMS service
    return { success: true };
  }

  static async verifyOTP(email, phone, otp, type) {
    try {
      const query = {};
      if (email) query.email = email.toLowerCase();
      if (phone) query.phone = phone;
      query.type = type;
      query.used = false;
      query.expires_at = { $gt: new Date() };
      
      const otpRecord = await OTP.findOne(query);
      
      if (!otpRecord) {
        return { valid: false, message: 'Invalid or expired OTP' };
      }
      
      if (otpRecord.attempts >= 5) {
        return { valid: false, message: 'Too many attempts. Request a new OTP.' };
      }
      
      if (otpRecord.otp !== otp) {
        otpRecord.attempts += 1;
        await otpRecord.save();
        return { valid: false, message: `Invalid OTP. ${5 - otpRecord.attempts} attempts remaining.` };
      }
      
      otpRecord.used = true;
      await otpRecord.save();
      
      console.log(`✅ OTP verified successfully for ${email || phone}`);
      
      return { valid: true, message: 'OTP verified successfully' };
    } catch (err) {
      console.error('OTP verification error:', err);
      return { valid: false, message: 'Verification failed' };
    }
  }
}

module.exports = OTPService;