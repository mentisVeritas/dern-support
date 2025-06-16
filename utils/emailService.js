import nodemailer from "nodemailer"
import crypto from "crypto"
import User from "../models/User.js"

// Debug logging function
const debugLog = (message, data = null) => {
  console.log(`🔍 [EMAIL DEBUG] ${message}`)
  if (data) {
    console.log("📊 [EMAIL DATA]", JSON.stringify(data, null, 2))
  }
}

// Environment validation
const validateEnvironment = () => {
  const required = ["SMTP_USER", "SMTP_PASS"]
  const missing = required.filter((key) => !process.env[key])
  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:", missing)
    return false
  }
  console.log("✅ All required environment variables are set")
  return true
}

// Create Gmail transporter
const createTransporter = () => {
  debugLog("Creating Gmail transporter...")
  if (!validateEnvironment()) {
    throw new Error("Missing required environment variables for email service")
  }

  const config = {
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    debug: true,
    logger: true,
  }

  debugLog("Creating transporter with config", config)
  return nodemailer.createTransport(config)
}

// Secure password generation
export const generateSecurePassword = (length = 12) => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  let password = ""
  const lowercase = "abcdefghijklmnopqrstuvwxyz"
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const numbers = "0123456789"
  const symbols = "!@#$%^&*"

  password += lowercase[crypto.randomInt(0, lowercase.length)]
  password += uppercase[crypto.randomInt(0, uppercase.length)]
  password += numbers[crypto.randomInt(0, numbers.length)]
  password += symbols[crypto.randomInt(0, symbols.length)]

  for (let i = 4; i < length; i++) {
    password += charset[crypto.randomInt(0, charset.length)]
  }

  return password
    .split("")
    .sort(() => crypto.randomInt(-1, 2))
    .join("")
}

// Generate unique username
export const generateUsername = (email, firstName = "", lastName = "") => {
  const emailPrefix = email.split("@")[0]
  const cleanFirstName = firstName.toLowerCase().replace(/[^a-z0-9]/g, "")
  const cleanLastName = lastName.toLowerCase().replace(/[^a-z0-9]/g, "")

  const options = [
    `${cleanFirstName}${cleanLastName}`,
    `${cleanFirstName}.${cleanLastName}`,
    `${emailPrefix}`,
    `${cleanFirstName}${crypto.randomInt(100, 999)}`,
    `user${crypto.randomInt(1000, 9999)}`,
  ]

  return options.find((option) => option.length >= 3) || `user${crypto.randomInt(1000, 9999)}`
}

// Email templates
const emailTemplates = {
  // ... existing templates ...

  requestApproved: (supportRequest, accountInfo = null) => ({
    subject: `✅ Support Request #${supportRequest._id.toString().slice(-8)} Approved - Dern Support`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 600;">🎉 Request Approved!</h1>
          <p style="margin: 15px 0 0 0; font-size: 16px; opacity: 0.9;">Great news! Your support request has been approved</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Request Details -->
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px; border-left: 5px solid #28a745;">
            <h2 style="color: #155724; margin-top: 0; font-size: 20px;">📋 Request Details</h2>
            <div style="line-height: 1.6;">
              <p style="margin: 8px 0;"><strong>Request ID:</strong> #${supportRequest._id.toString().slice(-8)}</p>
              <p style="margin: 8px 0;"><strong>Title:</strong> ${supportRequest.title}</p>
              <p style="margin: 8px 0;"><strong>Device Type:</strong> ${supportRequest.deviceType}</p>
              <p style="margin: 8px 0;"><strong>Urgency:</strong> ${supportRequest.urgency}</p>
              <p style="margin: 8px 0;"><strong>District:</strong> ${supportRequest.district || "Not specified"}</p>
              ${supportRequest.masterSetPrice ? `<p style="margin: 8px 0;"><strong>Approved Price:</strong> <span style="color: #28a745; font-weight: bold;">$${supportRequest.masterSetPrice}</span></p>` : ""}
              ${supportRequest.masterComments ? `<p style="margin: 8px 0;"><strong>Master Comments:</strong> ${supportRequest.masterComments}</p>` : ""}
              <p style="margin: 8px 0;"><strong>Approval Date:</strong> ${supportRequest.approvalDate || new Date().toLocaleDateString()}</p>
              ${supportRequest.masterName ? `<p style="margin: 8px 0;"><strong>Approved By:</strong> ${supportRequest.masterName}</p>` : ""}
            </div>
          </div>

          <!-- Account Information (if new account created) -->
          ${
            accountInfo
              ? `
          <div style="background: #d4edda; padding: 25px; border-radius: 8px; margin-bottom: 25px; border-left: 5px solid #28a745;">
            <h2 style="color: #155724; margin-top: 0; font-size: 20px;">🔐 Your Account Details</h2>
            <div style="background: white; padding: 20px; border-radius: 6px; margin: 15px 0; font-family: 'Courier New', monospace; border: 1px solid #c3e6cb;">
              <p style="margin: 8px 0; font-size: 14px;"><strong>Email:</strong> <span style="color: #007bff;">${accountInfo.email}</span></p>
              <p style="margin: 8px 0; font-size: 14px;"><strong>Username:</strong> <span style="color: #007bff;">${accountInfo.username}</span></p>
              <p style="margin: 8px 0; font-size: 14px;"><strong>Password:</strong> <span style="color: #dc3545; font-weight: bold;">${accountInfo.password}</span></p>
            </div>
          </div>
          `
              : ""
          }

          <!-- Next Steps -->
          <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 5px solid #17a2b8;">
            <h3 style="color: #0c5460; margin-top: 0;">🚀 What Happens Next?</h3>
            <ul style="color: #0c5460; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li><strong>Technician Assignment:</strong> A qualified technician will be assigned to your request</li>
              <li><strong>Contact:</strong> Our team will contact you within 24 hours to schedule service</li>
              <li><strong>Progress Tracking:</strong> Login to your account to track real-time progress</li>
              <li><strong>Updates:</strong> You'll receive email notifications at each step</li>
              <li><strong>Quality Service:</strong> We'll ensure your issue is resolved to your satisfaction</li>
            </ul>
          </div>

          <!-- Action Buttons -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/login" 
               style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; margin-right: 15px; box-shadow: 0 2px 4px rgba(0,123,255,0.3);">
              🔑 Login to Track Progress
            </a>
            <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/customer/dashboard" 
               style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; box-shadow: 0 2px 4px rgba(40,167,69,0.3);">
              📊 View Dashboard
            </a>
          </div>

          <!-- Support Information -->
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-top: 3px solid #007bff;">
            <h4 style="color: #495057; margin-top: 0;">Need Help?</h4>
            <p style="color: #6c757d; margin: 10px 0;">Our support team is available 24/7</p>
            <p style="margin: 5px 0;">
              📧 Email: <a href="mailto:support@dern-support.com" style="color: #007bff; text-decoration: none;">support@dern-support.com</a>
            </p>
            <p style="margin: 5px 0;">
              📞 Phone: <a href="tel:+998901234567" style="color: #007bff; text-decoration: none;">+998 90 123 45 67</a>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>© 2024 Dern Support. All rights reserved.</p>
          <p>This email was sent regarding your support request #${supportRequest._id.toString().slice(-8)}</p>
        </div>
      </div>
    `,
    text: `
🎉 SUPPORT REQUEST APPROVED!

Request Details:
- Request ID: #${supportRequest._id.toString().slice(-8)}
- Title: ${supportRequest.title}
- Device Type: ${supportRequest.deviceType}
- Urgency: ${supportRequest.urgency}
- District: ${supportRequest.district || "Not specified"}
${supportRequest.masterSetPrice ? `- Approved Price: $${supportRequest.masterSetPrice}` : ""}
${supportRequest.masterComments ? `- Master Comments: ${supportRequest.masterComments}` : ""}

${
  accountInfo
    ? `
Your Account Details:
- Email: ${accountInfo.email}
- Username: ${accountInfo.username}
- Password: ${accountInfo.password}
`
    : ""
}

What Happens Next?
1. A qualified technician will be assigned to your request
2. Our team will contact you within 24 hours to schedule service
3. Login to your account to track real-time progress
4. You'll receive email notifications at each step

Login: ${process.env.FRONTEND_URL || "http://localhost:3000"}/login

Need help? Contact us:
Email: support@dern-support.com
Phone: +998 90 123 45 67

© 2024 Dern Support. All rights reserved.
    `,
  }),

  requestRejected: (supportRequest) => ({
    subject: `❌ Support Request #${supportRequest._id.toString().slice(-8)} Rejected - Dern Support`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #dc3545, #c82333); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 600;">❌ Request Rejected</h1>
          <p style="margin: 15px 0 0 0; font-size: 16px; opacity: 0.9;">We've reviewed your support request</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Request Details -->
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px; border-left: 5px solid #dc3545;">
            <h2 style="color: #721c24; margin-top: 0; font-size: 20px;">📋 Request Details</h2>
            <div style="line-height: 1.6;">
              <p style="margin: 8px 0;"><strong>Request ID:</strong> #${supportRequest._id.toString().slice(-8)}</p>
              <p style="margin: 8px 0;"><strong>Title:</strong> ${supportRequest.title}</p>
              <p style="margin: 8px 0;"><strong>Device Type:</strong> ${supportRequest.deviceType}</p>
              <p style="margin: 8px 0;"><strong>Urgency:</strong> ${supportRequest.urgency}</p>
              <p style="margin: 8px 0;"><strong>District:</strong> ${supportRequest.district || "Not specified"}</p>
              <p style="margin: 8px 0;"><strong>Rejection Date:</strong> ${supportRequest.rejectionDate || new Date().toLocaleDateString()}</p>
              ${supportRequest.masterName ? `<p style="margin: 8px 0;"><strong>Reviewed By:</strong> ${supportRequest.masterName}</p>` : ""}
            </div>
          </div>

          <!-- Rejection Reason -->
          <div style="background: #f8d7da; padding: 25px; border-radius: 8px; margin-bottom: 25px; border-left: 5px solid #dc3545;">
            <h3 style="color: #721c24; margin-top: 0;">📝 Reason for Rejection</h3>
            <p style="color: #721c24; margin: 0; font-size: 16px; line-height: 1.6;">
              ${supportRequest.rejectionReason || "No specific reason provided."}
            </p>
            ${
              supportRequest.masterComments
                ? `
            <hr style="border-color: #f5c6cb; margin: 20px 0;">
            <h4 style="color: #721c24; margin-bottom: 10px;">Additional Comments:</h4>
            <p style="color: #721c24; margin: 0; font-style: italic;">
              ${supportRequest.masterComments}
            </p>
            `
                : ""
            }
          </div>

          <!-- Next Steps -->
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 5px solid #ffc107;">
            <h3 style="color: #856404; margin-top: 0;">🔄 What You Can Do Next</h3>
            <ul style="color: #856404; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li><strong>Review the feedback:</strong> Consider the rejection reason provided above</li>
              <li><strong>Submit a new request:</strong> You can create a new request with additional information</li>
              <li><strong>Contact support:</strong> Reach out for clarification or assistance</li>
              <li><strong>Check our knowledge base:</strong> Look for self-help resources</li>
              <li><strong>Account access:</strong> Your account remains active for future requests</li>
            </ul>
          </div>

          <!-- Action Buttons -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/customer/support/new" 
               style="background: #007bff; color: white; padding: 15px 25px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; margin-right: 15px; box-shadow: 0 2px 4px rgba(0,123,255,0.3);">
              📝 Submit New Request
            </a>
            <a href="mailto:support@dern-support.com?subject=Regarding Request #${supportRequest._id.toString().slice(-8)}" 
               style="background: #28a745; color: white; padding: 15px 25px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; box-shadow: 0 2px 4px rgba(40,167,69,0.3);">
              📧 Contact Support
            </a>
          </div>

          <!-- Support Information -->
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-top: 3px solid #007bff;">
            <h4 style="color: #495057; margin-top: 0;">Need Help?</h4>
            <p style="color: #6c757d; margin: 10px 0;">Our support team is available 24/7</p>
            <p style="margin: 5px 0;">
              📧 Email: <a href="mailto:support@dern-support.com" style="color: #007bff; text-decoration: none;">support@dern-support.com</a>
            </p>
            <p style="margin: 5px 0;">
              📞 Phone: <a href="tel:+998901234567" style="color: #007bff; text-decoration: none;">+998 90 123 45 67</a>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>© 2024 Dern Support. All rights reserved.</p>
          <p>This email was sent regarding your support request #${supportRequest._id.toString().slice(-8)}</p>
        </div>
      </div>
    `,
    text: `
❌ SUPPORT REQUEST REJECTED

Request Details:
- Request ID: #${supportRequest._id.toString().slice(-8)}
- Title: ${supportRequest.title}
- Device Type: ${supportRequest.deviceType}
- Urgency: ${supportRequest.urgency}
- District: ${supportRequest.district || "Not specified"}

Reason for Rejection:
${supportRequest.rejectionReason || "No specific reason provided."}

${
  supportRequest.masterComments
    ? `
Additional Comments:
${supportRequest.masterComments}
`
    : ""
}

What You Can Do Next:
1. Review the feedback provided above
2. Submit a new request with additional information
3. Contact support for clarification or assistance
4. Check our knowledge base for self-help resources
5. Your account remains active for future requests

Submit New Request: ${process.env.FRONTEND_URL || "http://localhost:3000"}/customer/support/new
Contact Support: support@dern-support.com
Phone: +998 90 123 45 67

© 2024 Dern Support. All rights reserved.
    `,
  }),

  accountCreated: (accountInfo, supportRequest) => ({
    subject: `🔐 Your Account Has Been Created - Support Request #${supportRequest._id.toString().slice(-8)}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🔐 Account Created!</h1>
          <p style="margin: 15px 0 0 0; font-size: 16px; opacity: 0.9;">Your account has been created successfully</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #28a745;">
            <h3 style="color: #155724; margin-top: 0;">🔑 Your Login Credentials</h3>
            <p style="color: #155724; margin: 5px 0;"><strong>Email:</strong> ${accountInfo.email}</p>
            <p style="color: #155724; margin: 5px 0;"><strong>Username:</strong> ${accountInfo.username}</p>
            <p style="color: #155724; margin: 5px 0;"><strong>Password:</strong> ${accountInfo.password}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/login" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              🚀 Login Now
            </a>
          </div>
        </div>
      </div>
    `,
    text: `
Account Created Successfully!

Your Login Credentials:
- Email: ${accountInfo.email}
- Username: ${accountInfo.username}
- Password: ${accountInfo.password}

Login: ${process.env.FRONTEND_URL || "http://localhost:3000"}/login
    `,
  }),
}

// Main email sending function
export const sendEmail = async (to, template, data, accountInfo = null) => {
  try {
    debugLog(`Starting email send process`)
    debugLog(`Recipient: ${to}`)
    debugLog(`Template: ${template}`)

    if (!to) throw new Error("No recipient email address provided")
    if (!emailTemplates[template]) throw new Error(`Email template "${template}" not found`)

    const transporter = createTransporter()
    debugLog("Transporter created successfully")

    const emailContent = emailTemplates[template](data, accountInfo)
    debugLog("Email content generated")

    const mailOptions = {
      from: `"Dern Support" <${process.env.SMTP_USER}>`,
      to,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    }

    debugLog("Attempting to send email...")
    const result = await transporter.sendMail(mailOptions)

    debugLog("Email sent successfully!", {
      messageId: result.messageId,
      response: result.response,
    })

    return {
      success: true,
      messageId: result.messageId,
      response: result.response,
    }
  } catch (error) {
    debugLog("Email sending failed with error:", {
      message: error.message,
      code: error.code,
    })
    return {
      success: false,
      error: error.message,
    }
  }
}

// Create account for guest user
export const createAccountForGuest = async (supportRequest) => {
  try {
    console.log("🔐 Creating account for guest user...")

    // Check if user already exists
    const existingUser = await User.findOne({ email: supportRequest.guestEmail })
    if (existingUser) {
      console.log("ℹ️ User already exists, linking request to existing account")
      supportRequest.customer = existingUser._id
      await supportRequest.save()
      return null // User already exists
    }

    // Generate credentials
    const password = generateSecurePassword(12)
    const username = generateUsername(
      supportRequest.guestEmail,
      supportRequest.guestName?.split(" ")[0] || "",
      supportRequest.guestName?.split(" ")[1] || "",
    )

    // Create new user
    const newUser = new User({
      email: supportRequest.guestEmail,
      username,
      password, // Will be hashed by pre-save hook
      firstName: supportRequest.guestName?.split(" ")[0] || "Guest",
      lastName: supportRequest.guestName?.split(" ").slice(1).join(" ") || "User",
      phone: supportRequest.guestPhone || "",
      accountType: "individual",
      isEmailVerified: true, // Auto-verify guest accounts
    })

    await newUser.save()
    console.log("✅ New user account created successfully")

    // Link support request to new user
    supportRequest.customer = newUser._id
    await supportRequest.save()
    console.log("✅ Support request linked to new user account")

    return {
      email: supportRequest.guestEmail,
      username,
      password,
      userId: newUser._id,
    }
  } catch (error) {
    console.error("❌ Error creating account for guest:", error)
    throw error
  }
}

// Send account creation notification
export const sendAccountCreationNotification = async (accountInfo, supportRequest) => {
  console.log("📧 Sending account creation notification...")
  return await sendEmail(accountInfo.email, "accountCreated", supportRequest, accountInfo)
}

// Send request approval notification
export const sendGuestApprovalNotification = async (supportRequest, accountInfo = null) => {
  console.log("📧 Sending approval notification...")
  if (supportRequest.guestEmail) {
    return await sendEmail(supportRequest.guestEmail, "requestApproved", supportRequest, accountInfo)
  }
  return { success: false, error: "No email address provided" }
}

// Send request rejection notification
export const sendGuestRejectionNotification = async (supportRequest) => {
  console.log("📧 Sending rejection notification...")
  if (supportRequest.guestEmail) {
    return await sendEmail(supportRequest.guestEmail, "requestRejected", supportRequest)
  }
  return { success: false, error: "No email address provided" }
}

// Additional email functions for compatibility
export const sendWelcomeEmail = async (to, userData) => {
  console.log("📧 Sending welcome email...")
  return await sendEmail(to, "accountCreated", userData, userData)
}

export const sendSupportConfirmation = async (to, supportRequest) => {
  console.log("📧 Sending support confirmation email...")

  // Create a simple confirmation template
  const confirmationTemplate = {
    subject: `✅ Support Request Received - #${supportRequest._id.toString().slice(-8)}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #007bff; color: white; padding: 20px; border-radius: 8px; text-align: center;">
          <h1 style="margin: 0;">✅ Support Request Received</h1>
          <p style="margin: 10px 0 0 0;">We've received your support request and will review it shortly.</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h2 style="color: #333; margin-top: 0;">Request Details</h2>
          <p><strong>Request ID:</strong> #${supportRequest._id.toString().slice(-8)}</p>
          <p><strong>Title:</strong> ${supportRequest.title}</p>
          <p><strong>Status:</strong> Pending Review</p>
          <p><strong>Submitted:</strong> ${new Date(supportRequest.createdAt).toLocaleDateString()}</p>
        </div>
        <div style="text-align: center; margin: 20px 0;">
          <p>We'll notify you once your request has been reviewed.</p>
          <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}" 
             style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Visit Our Website
          </a>
        </div>
      </div>
    `,
    text: `
Support Request Received

Request ID: #${supportRequest._id.toString().slice(-8)}
Title: ${supportRequest.title}
Status: Pending Review
Submitted: ${new Date(supportRequest.createdAt).toLocaleDateString()}

We'll notify you once your request has been reviewed.
Visit: ${process.env.FRONTEND_URL || "http://localhost:3000"}
    `,
  }

  try {
    const transporter = createTransporter()
    const mailOptions = {
      from: `"Dern Support" <${process.env.SMTP_USER}>`,
      to,
      subject: confirmationTemplate.subject,
      text: confirmationTemplate.text,
      html: confirmationTemplate.html,
    }

    const result = await transporter.sendMail(mailOptions)
    console.log("✅ Support confirmation email sent successfully")

    return {
      success: true,
      messageId: result.messageId,
      response: result.response,
    }
  } catch (error) {
    console.error("❌ Error sending support confirmation email:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Test email function
export const sendTestEmail = async (to) => {
  console.log(`🧪 Sending test email to: ${to}`)

  const testTemplate = {
    subject: "🧪 Dern Support - Email Test",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #007bff; color: white; padding: 20px; border-radius: 8px; text-align: center;">
          <h1>✅ Email Test Successful!</h1>
          <p>Your email configuration is working correctly.</p>
          <p>Timestamp: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `,
    text: `Email Test Successful! Configuration working. Time: ${new Date().toLocaleString()}`,
  }

  try {
    const transporter = createTransporter()
    const mailOptions = {
      from: `"Dern Support" <${process.env.SMTP_USER}>`,
      to,
      subject: testTemplate.subject,
      text: testTemplate.text,
      html: testTemplate.html,
    }

    const result = await transporter.sendMail(mailOptions)
    console.log("✅ Test email sent successfully")

    return {
      success: true,
      messageId: result.messageId,
      response: result.response,
    }
  } catch (error) {
    console.error("❌ Error sending test email:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Email connection test
export const testEmailConnection = async () => {
  try {
    const transporter = createTransporter()
    console.log("🔍 Testing email connection...")

    const result = await transporter.verify()
    console.log("✅ Email connection successful")
    return { success: true, message: "Email connection verified" }
  } catch (error) {
    console.error("❌ Email connection failed:", error)
    return { success: false, error: error.message }
  }
}
