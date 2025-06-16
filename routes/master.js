import express from "express"
import { isAuthenticated, isMaster } from "./auth.js"
import User from "../models/User.js"
import SupportRequest from "../models/SupportRequest.js"
import SparePart from "../models/SparePart.js"
import KnowledgeBase from "../models/KnowledgeBase.js"
import { sendGuestApprovalNotification, sendGuestRejectionNotification } from "../utils/emailService.js"

const router = express.Router()

// Apply authentication and master middleware to all master routes
router.use(isAuthenticated)
router.use(isMaster)

// Enhanced master dashboard with complete statistics
router.get("/dashboard", async (req, res) => {
  try {
    console.log("🔍 Loading Master Dashboard...")

    // Initialize all variables with default values to prevent undefined errors
    let totalUsers = 0
    let totalCustomers = 0
    let totalAdmins = 0
    let totalMasters = 0
    let totalRequests = 0
    let pendingRequestsCount = 0
    let pendingApprovalCount = 0
    let inProgressRequestsCount = 0
    let resolvedRequestsCount = 0
    let totalKnowledgeArticles = 0
    let allSupportRequests = []
    let pendingApprovalRequests = []
    let todayAppointments = []
    let lowStockParts = []

    try {
      // User statistics
      totalUsers = (await User.countDocuments()) || 0
      totalCustomers = (await User.countDocuments({ isAdmin: false, isMaster: false })) || 0
      totalAdmins = (await User.countDocuments({ isAdmin: true, isMaster: false })) || 0
      totalMasters = (await User.countDocuments({ isMaster: true })) || 0
      console.log("✅ User statistics loaded")
    } catch (error) {
      console.error("❌ Error loading user statistics:", error)
    }

    try {
      // Support request statistics
      totalRequests = (await SupportRequest.countDocuments()) || 0
      pendingRequestsCount = (await SupportRequest.countDocuments({ status: "pending" })) || 0
      pendingApprovalCount = (await SupportRequest.countDocuments({ approvalStatus: "pending_approval" })) || 0
      inProgressRequestsCount = (await SupportRequest.countDocuments({ status: "in-progress" })) || 0
      resolvedRequestsCount = (await SupportRequest.countDocuments({ status: "resolved" })) || 0
      console.log("✅ Request statistics loaded")
    } catch (error) {
      console.error("❌ Error loading request statistics:", error)
    }

    try {
      // Get all support requests (master should see everything)
      allSupportRequests = await SupportRequest.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("customer", "firstName lastName email phone businessName accountType")
        .populate("assignedTo", "firstName lastName email")
        .populate("masterApprovedBy", "firstName lastName email")
        .lean()

      // Handle missing customer data
      allSupportRequests = allSupportRequests.map((request) => ({
        ...request,
        customer: request.customer || {
          firstName: request.guestName?.split(" ")[0] || "Guest",
          lastName: request.guestName?.split(" ").slice(1).join(" ") || "User",
          email: request.guestEmail || "N/A",
        },
      }))
      console.log("✅ Support requests loaded")
    } catch (error) {
      console.error("❌ Error loading support requests:", error)
      allSupportRequests = []
    }

    try {
      // Get requests pending master approval
      pendingApprovalRequests = await SupportRequest.find({
        approvalStatus: "pending_approval",
      })
        .sort({ createdAt: -1 })
        .populate("customer", "firstName lastName email phone businessName accountType")
        .lean()

      // Handle missing customer data for pending requests
      pendingApprovalRequests = pendingApprovalRequests.map((request) => ({
        ...request,
        customer: request.customer || {
          firstName: request.guestName?.split(" ")[0] || "Guest",
          lastName: request.guestName?.split(" ").slice(1).join(" ") || "User",
          email: request.guestEmail || "N/A",
        },
      }))
      console.log("✅ Pending approval requests loaded")
    } catch (error) {
      console.error("❌ Error loading pending approval requests:", error)
      pendingApprovalRequests = []
    }

    try {
      // Get today's appointments
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      todayAppointments =
        (await SupportRequest.find({
          appointmentDate: { $gte: today, $lt: tomorrow },
        }).populate("customer", "firstName lastName email phone")) || []
      console.log("✅ Today's appointments loaded")
    } catch (error) {
      console.error("❌ Error loading today's appointments:", error)
      todayAppointments = []
    }

    try {
      // Get low stock parts
      lowStockParts =
        (await SparePart.find({
          stockQuantity: { $lte: 5 },
          isActive: true,
        }).limit(5)) || []
      console.log("✅ Low stock parts loaded")
    } catch (error) {
      console.error("❌ Error loading low stock parts:", error)
      lowStockParts = []
    }

    try {
      // Get system statistics
      totalKnowledgeArticles = (await KnowledgeBase.countDocuments({ isPublished: true })) || 0
      console.log("✅ Knowledge base statistics loaded")
    } catch (error) {
      console.error("❌ Error loading knowledge base statistics:", error)
      totalKnowledgeArticles = 0
    }

    console.log("✅ Master Dashboard data loaded successfully")

    // Render with all required variables
    res.render("master/dashboard", {
      title: "Master Dashboard",
      // User statistics
      totalUsers,
      totalCustomers,
      totalAdmins,
      totalMasters,
      // Support request statistics
      totalRequests,
      pendingRequestsCount,
      pendingApprovalCount,
      inProgressRequestsCount,
      resolvedRequestsCount,
      // Data arrays
      allSupportRequests,
      pendingApprovalRequests,
      todayAppointments,
      lowStockParts,
      // System statistics
      totalKnowledgeArticles,
      // Additional context
      user: req.session.user,
      currentPage: "dashboard",
    })
  } catch (error) {
    console.error("❌ Master dashboard error:", error)
    res.status(500).render("error", {
      error: "Error loading master dashboard",
      details: error.message,
    })
  }
})

// Master support request management (view all requests)
router.get("/support", async (req, res) => {
  try {
    const { status, urgency, deviceType, approvalStatus } = req.query

    // Build filter (master can see all requests regardless of approval status)
    const filter = {}

    if (status) filter.status = status
    if (urgency) filter.urgency = urgency
    if (deviceType) filter.deviceType = deviceType
    if (approvalStatus) filter.approvalStatus = approvalStatus

    const supportRequests = await SupportRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("customer", "firstName lastName email phone businessName accountType")
      .populate("assignedTo", "firstName lastName email")
      .populate("masterApprovedBy", "firstName lastName email")

    res.render("master/support-list", {
      title: "All Support Requests",
      supportRequests,
      filters: { status, urgency, deviceType, approvalStatus },
      user: req.session.user || null, // Передаем user только если нужен (иначе null)
      currentPage: "support",
    })
  } catch (error) {
    console.error("Master support management error:", error)
    res.status(500).render("error", { error: "Error loading support requests" })
  }
})

// Master support request detail view
router.get("/support/:id", async (req, res) => {
  try {
    const supportRequest = await SupportRequest.findById(req.params.id)
      .populate("customer", "firstName lastName email phone businessName accountType address")
      .populate("assignedTo", "firstName lastName email")
      .populate("masterApprovedBy", "firstName lastName email")
      .populate("partsUsed.part")

    if (!supportRequest) {
      return res.status(404).render("error", { error: "Support request not found" })
    }

    // Get available parts for master to manage
    const availableParts = await SparePart.find({
      stockQuantity: { $gt: 0 },
      isActive: true,
    })

    // Get all technicians (admins) for assignment
    const technicians = await User.find({
      isAdmin: true,
    })

    res.render("master/support-detail", {
      title: "Support Request Details",
      supportRequest,
      availableParts,
      technicians,
      user: req.session.user,
      currentPage: "support",
    })
  } catch (error) {
    console.error("Master support detail error:", error)
    res.status(500).render("error", { error: "Error loading support request details" })
  }
})

// Enhanced approval/rejection with comprehensive email notifications
router.post("/support/:id/approve", async (req, res) => {
  try {
    const { action, masterSetPrice, masterComments, rejectionReason } = req.body

    const supportRequest = await SupportRequest.findById(req.params.id).populate("customer", "firstName lastName email")

    if (!supportRequest) {
      return res.status(404).json({ error: "Support request not found" })
    }

    const masterUser = await User.findById(req.session.user)

    if (action === "approve") {
      // Update request status
      supportRequest.approvalStatus = "approved"
      supportRequest.masterApprovedBy = req.session.user
      supportRequest.masterApprovedAt = new Date()
      supportRequest.masterSetPrice = masterSetPrice ? Number.parseFloat(masterSetPrice) : null
      supportRequest.masterComments = masterComments || ""
      supportRequest.status = "pending" // Ready for assignment

      await supportRequest.save()
      console.log("✅ Request approved:", supportRequest._id)

      // Send approval email
      const emailTarget = supportRequest.guestEmail || supportRequest.customer?.email
      if (emailTarget) {
        try {
          const emailData = {
            ...supportRequest.toObject(),
            masterName: `${masterUser.firstName} ${masterUser.lastName}`,
            approvalDate: new Date().toLocaleDateString(),
          }

          const emailResult = await sendGuestApprovalNotification(emailData)
          if (emailResult.success) {
            console.log("✅ Approval email sent to:", emailTarget)
          } else {
            console.error("❌ Failed to send approval email:", emailResult.error)
          }
        } catch (emailError) {
          console.error("❌ Email notification error:", emailError)
        }
      }

      req.session.successMessage = "Support request approved successfully!"
    } else if (action === "reject") {
      // Update request status
      supportRequest.approvalStatus = "rejected"
      supportRequest.rejectionReason = rejectionReason || "No reason provided"
      supportRequest.masterComments = masterComments || ""
      supportRequest.status = "closed"

      await supportRequest.save()
      console.log("✅ Request rejected:", supportRequest._id)

      // Send rejection email
      const emailTarget = supportRequest.guestEmail || supportRequest.customer?.email
      if (emailTarget) {
        try {
          const emailData = {
            ...supportRequest.toObject(),
            masterName: `${masterUser.firstName} ${masterUser.lastName}`,
            rejectionDate: new Date().toLocaleDateString(),
          }

          const emailResult = await sendGuestRejectionNotification(emailData)
          if (emailResult.success) {
            console.log("✅ Rejection email sent to:", emailTarget)
          } else {
            console.error("❌ Failed to send rejection email:", emailResult.error)
          }
        } catch (emailError) {
          console.error("❌ Email notification error:", emailError)
        }
      }

      req.session.successMessage = "Support request rejected."
    }

    res.redirect(`/master/support/${supportRequest._id}`)
  } catch (error) {
    console.error("❌ Approval/rejection error:", error)
    res.status(500).json({ error: "Error processing request" })
  }
})

// Assignment route
router.post("/support/:id/assign", async (req, res) => {
  try {
    const { assignTo } = req.body
    const supportRequest = await SupportRequest.findById(req.params.id)

    if (!supportRequest) {
      return res.status(404).json({ error: "Support request not found" })
    }

    if (!assignTo) {
      return res.status(400).json({ error: "Please select a technician" })
    }

    supportRequest.assignedTo = assignTo
    supportRequest.status = "in-progress"
    await supportRequest.save()

    req.session.successMessage = "Request assigned successfully!"
    res.redirect(`/master/support/${supportRequest._id}`)
  } catch (error) {
    console.error("❌ Assignment error:", error)
    res.status(500).json({ error: "Error assigning request" })
  }
})

// Enhanced user management with detailed view
router.get("/users", async (req, res) => {
  try {
    const { role, accountType, search, sort = "createdAt", order = "desc" } = req.query

    // Build filter
    const filter = {}
    if (role === "customer") {
      filter.isAdmin = false
      filter.isMaster = false
    } else if (role === "admin") {
      filter.isAdmin = true
      filter.isMaster = false
    } else if (role === "master") {
      filter.isMaster = true
    }

    if (accountType) filter.accountType = accountType

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ]
    }

    // Sort options
    const sortOrder = order === "desc" ? -1 : 1
    const sortObj = { [sort]: sortOrder }

    const users = await User.find(filter).sort(sortObj).select("-password")

    // Get user statistics
    const userStats = {
      total: await User.countDocuments(filter),
      customers: await User.countDocuments({ ...filter, isAdmin: false, isMaster: false }),
      admins: await User.countDocuments({ ...filter, isAdmin: true, isMaster: false }),
      masters: await User.countDocuments({ ...filter, isMaster: true }),
      verified: await User.countDocuments({ ...filter, isEmailVerified: true }),
      unverified: await User.countDocuments({ ...filter, isEmailVerified: false }),
    }

    res.render("master/users", {
      title: "User Management",
      users,
      userStats,
      filters: { role, accountType, search, sort, order },
      user: req.session.user,
      currentPage: "users",
    })
  } catch (error) {
    console.error("❌ User management error:", error)
    res.status(500).render("error", { error: "Error loading users" })
  }
})

// Create new user (master only)
router.post("/users/create", async (req, res) => {
  try {
    const { email, firstName, lastName, phone, accountType, businessName, isAdmin, isMaster } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User with this email already exists",
      })
    }

    // Generate secure credentials
    const { generateSecurePassword, generateUsername } = await import("../utils/emailService.js")
    const password = generateSecurePassword(12)
    const username = generateUsername(email, firstName, lastName)

    // Create new user
    const newUser = new User({
      email,
      username,
      password, // Will be hashed by pre-save hook
      firstName,
      lastName,
      phone,
      accountType,
      businessName: accountType === "business" ? businessName : undefined,
      isAdmin: isAdmin === "true",
      isMaster: isMaster === "true",
      isEmailVerified: true, // Master-created accounts are pre-verified
    })

    await newUser.save()

    // Send welcome email with credentials
    const { sendMasterCreatedAccountNotification } = await import("../utils/emailService.js")
    const emailResult = await sendMasterCreatedAccountNotification({
      email,
      username,
      password,
      userId: newUser._id,
    })

    res.json({
      success: true,
      message: "User created successfully",
      emailSent: emailResult.success,
    })
  } catch (error) {
    console.error("Error creating user:", error)
    res.status(500).json({
      success: false,
      error: "Error creating user",
    })
  }
})

// Enhanced user detail view with support request history
router.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password")
    if (!user) {
      return res.status(404).render("error", { error: "User not found" })
    }

    // Get user's support request history
    const supportRequests = await SupportRequest.find({ customer: user._id })
      .sort({ createdAt: -1 })
      .populate("assignedTo", "firstName lastName email")
      .populate("masterApprovedBy", "firstName lastName email")

    // Get user statistics
    const userRequestStats = {
      total: supportRequests.length,
      pending: supportRequests.filter((r) => r.status === "pending").length,
      approved: supportRequests.filter((r) => r.approvalStatus === "approved").length,
      rejected: supportRequests.filter((r) => r.approvalStatus === "rejected").length,
      resolved: supportRequests.filter((r) => r.status === "resolved").length,
    }

    res.render("master/user-detail", {
      title: `User Details - ${user.firstName} ${user.lastName}`,
      user,
      supportRequests,
      userRequestStats,
      currentUser: req.session.user,
      currentPage: "users",
    })
  } catch (error) {
    console.error("❌ User detail error:", error)
    res.status(500).render("error", { error: "Error loading user details" })
  }
})

// System settings
router.get("/settings", async (req, res) => {
  try {
    // Get system statistics for settings page
    const systemStats = {
      totalUsers: await User.countDocuments(),
      totalRequests: await SupportRequest.countDocuments(),
      totalParts: await SparePart.countDocuments({ isActive: true }),
      totalArticles: await KnowledgeBase.countDocuments({ isPublished: true }),
    }

    res.render("master/settings", {
      title: "System Settings",
      systemStats,
      user: req.session.user,
      currentPage: "settings",
    })
  } catch (error) {
    console.error("Master settings error:", error)
    res.status(500).render("error", { error: "Error loading settings" })
  }
})

// System logs (placeholder for future implementation)
router.get("/logs", async (req, res) => {
  try {
    // This would typically fetch from a logging system
    const logs = [
      {
        timestamp: new Date(),
        level: "INFO",
        message: "System started successfully",
        user: "System",
      },
    ]

    res.render("master/logs", {
      title: "System Logs",
      logs,
      user: req.session.user,
      currentPage: "logs",
    })
  } catch (error) {
    console.error("Master logs error:", error)
    res.status(500).render("error", { error: "Error loading logs" })
  }
})

// Master analytics page - admin analytics bilan bir xil
router.get("/analytics", async (req, res) => {
  try {
    console.log("🔍 Loading Master Analytics...")

    // Initialize all variables with default values
    let totalRequests = 0
    let deviceTypes = []
    let urgencyLevels = []
    let avgRating = 0
    let monthlyRequests = []
    let locations = []

    try {
      totalRequests = await SupportRequest.countDocuments()
      console.log("📊 Total Requests:", totalRequests)
    } catch (error) {
      console.error("❌ Error getting total requests:", error)
    }

    try {
      deviceTypes = await SupportRequest.aggregate([
        { $group: { _id: "$deviceType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      console.log("📊 Device Types:", deviceTypes)
    } catch (error) {
      console.error("❌ Error getting device types:", error)
      deviceTypes = []
    }

    try {
      urgencyLevels = await SupportRequest.aggregate([
        { $group: { _id: "$urgency", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      console.log("📊 Urgency Levels:", urgencyLevels)
    } catch (error) {
      console.error("❌ Error getting urgency levels:", error)
      urgencyLevels = []
    }

    try {
      const ratingResult = await SupportRequest.aggregate([
        { $match: { customerRating: { $exists: true, $ne: null, $gt: 0 } } },
        { $group: { _id: null, avgRating: { $avg: "$customerRating" } } },
      ])
      avgRating = ratingResult.length > 0 ? Number(ratingResult[0].avgRating) || 0 : 0
      console.log("📊 Average Rating:", avgRating)
    } catch (error) {
      console.error("❌ Error calculating average rating:", error)
      avgRating = 0
    }

    try {
      monthlyRequests = await SupportRequest.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ])
      console.log("📊 Monthly Requests:", monthlyRequests)
    } catch (error) {
      console.error("❌ Error getting monthly requests:", error)
      monthlyRequests = []
    }

    try {
      locations = await SupportRequest.aggregate([
        { $match: { location: { $exists: true, $ne: null, $ne: "" } } },
        { $group: { _id: "$location", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      console.log("📊 Locations:", locations)
    } catch (error) {
      console.error("❌ Error getting locations:", error)
      locations = []
    }

    console.log("✅ Master Analytics data loaded successfully")

    res.render("master/analytics", {
      title: "Master Analytics",
      totalRequests: totalRequests || 0,
      deviceTypes: deviceTypes || [],
      urgencyLevels: urgencyLevels || [],
      avgRating: Number(avgRating) || 0,
      monthlyRequests: monthlyRequests || [],
      locations: locations || [],
      viewOnly: false,
      user: req.session.user,
      isAdmin: false,
      isMaster: true,
      currentPage: "analytics",
    })
  } catch (error) {
    console.error("❌ Master analytics error:", error)
    res.status(500).render("error", { error: "Error loading analytics" })
  }
})

export { router as masterRoutes }
