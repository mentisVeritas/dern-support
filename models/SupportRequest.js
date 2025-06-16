import mongoose from "mongoose"

const supportRequestSchema = new mongoose.Schema(
  {
    // Customer information
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Not required for guest requests
    },

    // Guest user information (for non-registered users)
    guestEmail: {
      type: String,
      required: false,
    },
    guestName: {
      type: String,
      required: false,
    },
    guestPhone: {
      type: String,
      required: false,
    },
    isGuestRequest: {
      type: Boolean,
      default: false,
    },

    // Request details
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    deviceType: {
      type: String,
      required: true,
      enum: ["desktop", "laptop", "tablet", "smartphone", "printer", "server", "network", "other"],
    },
    urgency: {
      type: String,
      required: true,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    district: {
      type: String,
      required: false,
    },

    // Status tracking
    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved", "closed"],
      default: "pending",
    },
    approvalStatus: {
      type: String,
      enum: ["pending_approval", "approved", "rejected"],
      default: "pending_approval",
    },

    // Assignment
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    assignedAt: {
      type: Date,
      required: false,
    },

    // Master approval
    masterApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    masterApprovedAt: {
      type: Date,
      required: false,
    },
    masterSetPrice: {
      type: Number,
      required: false,
    },
    masterComments: {
      type: String,
      required: false,
    },
    rejectionReason: {
      type: String,
      required: false,
    },

    // Pricing and cost
    estimatedCost: {
      type: Number,
      required: false,
    },
    finalCost: {
      type: Number,
      required: false,
    },

    // Scheduling
    appointmentDate: {
      type: Date,
      required: false,
    },
    appointmentTime: {
      type: String,
      required: false,
    },

    // Parts used
    partsUsed: [
      {
        part: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SparePart",
        },
        quantity: {
          type: Number,
          default: 1,
        },
        unitPrice: {
          type: Number,
          required: true,
        },
      },
    ],

    // Resolution
    resolutionNotes: {
      type: String,
      required: false,
    },
    resolvedAt: {
      type: Date,
      required: false,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    // Customer feedback
    customerRating: {
      type: Number,
      min: 1,
      max: 5,
      required: false,
    },
    customerFeedback: {
      type: String,
      required: false,
    },

    // Additional fields
    location: {
      type: String,
      required: false,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Method to calculate estimated cost
supportRequestSchema.methods.calculateEstimatedCost = function () {
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

  const baseRate = baseRates[this.deviceType] || 80
  const multiplier = urgencyMultipliers[this.urgency] || 1
  return baseRate * multiplier
}

// Index for better query performance
supportRequestSchema.index({ customer: 1, createdAt: -1 })
supportRequestSchema.index({ status: 1 })
supportRequestSchema.index({ approvalStatus: 1 })
supportRequestSchema.index({ assignedTo: 1 })
supportRequestSchema.index({ guestEmail: 1 })

const SupportRequest = mongoose.model("SupportRequest", supportRequestSchema)

export default SupportRequest
