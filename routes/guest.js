import express from "express"
import SupportRequest from "../models/SupportRequest.js"
import { createAccountForGuest, sendAccountCreationNotification } from "../utils/emailService.js"

const router = express.Router()

// Guest support form
router.get("/guest-support", (req, res) => {
  res.render("guest-support")
})

// Submit guest support request with automatic account creation and email
router.post("/guest-support", async (req, res) => {
  try {
    const { email, name, phone, title, description, deviceType, urgency, district } = req.body

    console.log("🚀 Processing guest support request...")
    console.log("📧 Email:", email)
    console.log("👤 Name:", name)

    // Enhanced validation
    if (!email || !title || !description || !deviceType || !urgency) {
      console.log("❌ Validation failed: Missing required fields")
      return res.render("guest-support", {
        error: "Please fill in all required fields",
        formData: req.body,
      })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log("❌ Validation failed: Invalid email format")
      return res.render("guest-support", {
        error: "Please enter a valid email address",
        formData: req.body,
      })
    }

    // Step 1: Create support request
    console.log("📝 Creating support request...")
    const supportRequest = new SupportRequest({
      guestEmail: email,
      guestName: name || "Guest User",
      guestPhone: phone,
      title: title.trim(),
      description: description.trim(),
      deviceType,
      urgency,
      district: district || "Not specified",
      status: "pending",
      approvalStatus: "pending_approval",
      isGuestRequest: true,
      isVisible: true,
      submittedAt: new Date(),
    })

    // Calculate estimated cost
    const baseRates = {
      desktop: 75,
      laptop: 85,
      tablet: 65,
      smartphone: 60,
      printer: 70,
      server: 150,
      network: 100,
      other: 80,
    }

    const urgencyMultipliers = {
      low: 1,
      medium: 1.25,
      high: 1.5,
      critical: 2,
    }

    const baseRate = baseRates[deviceType] || 80
    const multiplier = urgencyMultipliers[urgency] || 1
    supportRequest.estimatedCost = baseRate * multiplier

    // Save and get the saved document with proper _id
    const savedSupportRequest = await supportRequest.save()
    console.log("✅ Support request created with ID:", savedSupportRequest._id)
    console.log("✅ Support request object:", {
      id: savedSupportRequest._id,
      title: savedSupportRequest.title,
      email: savedSupportRequest.guestEmail,
    })

    // Step 2: Create user account automatically
    let accountInfo = null
    let accountCreated = false

    try {
      console.log("🔐 Creating user account...")
      accountInfo = await createAccountForGuest(savedSupportRequest)

      if (accountInfo) {
        accountCreated = true
        console.log("✅ User account created successfully")
        console.log("📧 Account email:", accountInfo.email)
        console.log("👤 Username:", accountInfo.username)

        // Step 3: Send welcome email with login credentials
        console.log("📧 Preparing to send welcome email...")
        console.log("📧 Support request ID for email:", savedSupportRequest._id)
        console.log("📧 Account info for email:", {
          email: accountInfo.email,
          username: accountInfo.username,
          hasPassword: !!accountInfo.password,
        })

        try {
          const emailResult = await sendAccountCreationNotification(accountInfo, savedSupportRequest)

          if (emailResult.success) {
            console.log("✅ Welcome email sent successfully!")
            console.log("📧 Message ID:", emailResult.messageId)
          } else {
            console.error("❌ Failed to send welcome email:")
            console.error("❌ Error:", emailResult.error)
            console.error("❌ Details:", emailResult.details || "No details available")
          }
        } catch (emailError) {
          console.error("❌ Email sending error:", emailError)
          console.error("❌ Stack trace:", emailError.stack)
        }
      } else {
        console.log("ℹ️ User already exists, request linked to existing account")
      }
    } catch (accountError) {
      console.error("❌ Account creation error:", accountError)
      console.error("❌ Stack trace:", accountError.stack)
    }

    // Step 4: Success response
    const referenceId = savedSupportRequest._id.toString().slice(-6).toUpperCase()

    if (accountCreated && accountInfo) {
      console.log("🎉 Complete success - account created and email sent")
      res.render("guest-support", {
        success: `🎉 SUCCESS! Your support request has been submitted and account created!

📧 Account Details:
• Email: ${accountInfo.email}
• Username: ${accountInfo.username}
• Password: ${accountInfo.password}

📋 Request Details:
• Reference ID: ${referenceId}
• Status: Pending Master Approval
• Estimated Cost: $${savedSupportRequest.estimatedCost}

📬 Check your email for login credentials and further instructions.
You can login immediately to track your request progress.`,
        accountInfo,
        supportRequest: savedSupportRequest,
      })
    } else {
      console.log("⚠️ Partial success - request created but account creation failed or user exists")
      res.render("guest-support", {
        success: `✅ Support request submitted successfully!

📋 Request Details:
• Reference ID: ${referenceId}
• Status: Pending Review
• Estimated Cost: $${savedSupportRequest.estimatedCost}

${accountInfo ? "• Account linked to existing user" : "• Account creation encountered an issue"}

You can login to track progress if you have an existing account.`,
        supportRequest: savedSupportRequest,
      })
    }
  } catch (error) {
    console.error("❌ Guest support processing error:", error)
    console.error("❌ Stack trace:", error.stack)
    res.render("guest-support", {
      error: "An error occurred while processing your request. Please try again.",
      formData: req.body,
    })
  }
})

export { router as guestRoutes }
