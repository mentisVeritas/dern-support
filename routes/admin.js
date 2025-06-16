import express from "express";
import { isAuthenticated, isAdmin } from "./auth.js";
import User from "../models/User.js";
import SupportRequest from "../models/SupportRequest.js";
import SparePart from "../models/SparePart.js";

const router = express.Router();

// Apply authentication and admin middleware to all admin routes
router.use(isAuthenticated);
router.use(isAdmin);

// Admin dashboard
router.get("/dashboard", async (req, res) => {
  try {
    // Get counts
    const pendingRequestsCount = await SupportRequest.countDocuments({
      status: "pending",
    });
    const inProgressRequestsCount = await SupportRequest.countDocuments({
      status: "in-progress",
    });
    const resolvedRequestsCount = await SupportRequest.countDocuments({
      status: "resolved",
    });
    const customersCount = await User.countDocuments({ isAdmin: false });

    // Get low stock parts
    const lowStockParts = await SparePart.find({
      stockQuantity: { $lte: 5 },
      isActive: true,
    }).limit(5);

    // Get today's appointments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAppointments = await SupportRequest.find({
      appointmentDate: { $gte: today, $lt: tomorrow },
    }).populate("customer", "firstName lastName email phone");

    // Get recent support requests (including guest requests)
    const recentRequests = await SupportRequest.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("customer", "firstName lastName email")
      .lean();

    res.render("admin/dashboard", {
      pendingRequestsCount,
      inProgressRequestsCount,
      resolvedRequestsCount,
      customersCount,
      lowStockParts,
      todayAppointments,
      recentRequests,
      user: req.session.user,
      isAdmin: true,
      isMaster: false,
      currentPage: "dashboard",
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).render("error", { error: "Error loading admin dashboard" });
  }
});

// Customer management (VIEW ONLY)
router.get("/customers", async (req, res) => {
  try {
    const customers = await User.find({ isAdmin: false }).sort({
      createdAt: -1,
    });

    res.render("admin/customers", {
      customers,
      viewOnly: true,
      user: req.session.user,
      isAdmin: true,
      isMaster: false,
      currentPage: "customers",
    });
  } catch (error) {
    console.error("Customer management error:", error);
    res.status(500).render("error", { error: "Error loading customers" });
  }
});

// View customer (READ ONLY)
router.get("/customers/:id", async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);

    if (!customer) {
      return res.status(404).render("error", { error: "Customer not found" });
    }

    // Get customer's support requests
    const supportRequests = await SupportRequest.find({
      customer: customer._id,
    }).sort({ createdAt: -1 });

    res.render("admin/customer-detail", {
      customer,
      supportRequests,
      viewOnly: true,
      user: req.session.user,
      isAdmin: true,
      isMaster: false,
      currentPage: "customers",
    });
  } catch (error) {
    console.error("View customer error:", error);
    res
      .status(500)
      .render("error", { error: "Error loading customer details" });
  }
});

// Support request management (VIEW ONLY)
router.get("/support", async (req, res) => {
  try {
    const { status, urgency, deviceType } = req.query;

    // Build filter
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (urgency) {
      filter.urgency = urgency;
    }

    if (deviceType) {
      filter.deviceType = deviceType;
    }

    const supportRequests = await SupportRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("customer", "firstName lastName email");

    res.render("admin/support-list", {
      supportRequests,
      filters: { status, urgency, deviceType },
      viewOnly: true,
      user: req.session.user,
      isAdmin: true,
      isMaster: false,
      currentPage: "support",
    });
  } catch (error) {
    console.error("Support management error:", error);
    res
      .status(500)
      .render("error", { error: "Error loading support requests" });
  }
});

// View support request (ADMIN: can change status, no master actions)
router.get("/support/:id", async (req, res) => {
  try {
    const supportRequest = await SupportRequest.findById(req.params.id)
      .populate(
        "customer",
        "firstName lastName email phone businessName accountType"
      )
      .populate("assignedTo", "firstName lastName email")
      .populate("masterApprovedBy", "firstName lastName email")
      .populate({
        path: "partsUsed.part",
        model: "SparePart",
        select: "name price category",
      });

    if (!supportRequest) {
      return res
        .status(404)
        .render("error", { error: "Support request not found" });
    }

    // Для админа разрешаем менять статус, но не master-level действия
    res.render("admin/support-detail", {
      supportRequest,
      viewOnly: false, // теперь админ может менять статус
      canChangeStatus: true,
      isAdmin: true,
      isMaster: false,
      user: req.session.user,
      currentPage: "support",
    });
  } catch (error) {
    console.error("View support request error:", error);
    res
      .status(500)
      .render("error", { error: "Error loading support request details" });
  }
});

// Spare parts management (VIEW ONLY)
router.get("/parts", async (req, res) => {
  try {
    const { category, lowStock } = req.query;

    // Build filter
    const filter = { isActive: true };

    if (category) {
      filter.category = category;
    }

    if (lowStock === "true") {
      filter.stockQuantity = { $lte: 5 };
    }

    const spareParts = await SparePart.find(filter).sort({ name: 1 });

    res.render("admin/parts-list", {
      spareParts,
      filters: { category, lowStock },
      viewOnly: true,
      user: req.session.user,
      isAdmin: true,
      isMaster: false,
      currentPage: "parts",
    });
  } catch (error) {
    console.error("Parts management error:", error);
    res.status(500).render("error", { error: "Error loading spare parts" });
  }
});

// Analytics (VIEW ONLY)
router.get("/analytics", async (req, res) => {
  try {
    // Get support request stats
    const totalRequests = await SupportRequest.countDocuments();

    // Get device type distribution
    const deviceTypes = await SupportRequest.aggregate([
      { $group: { _id: "$deviceType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Get urgency distribution
    const urgencyLevels = await SupportRequest.aggregate([
      { $group: { _id: "$urgency", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Get average customer rating
    const ratingResult = await SupportRequest.aggregate([
      { $match: { customerRating: { $exists: true, $ne: null } } },
      { $group: { _id: null, avgRating: { $avg: "$customerRating" } } },
    ]);
    const avgRating = ratingResult.length > 0 ? ratingResult[0].avgRating : 0;

    // Get monthly request counts
    const monthlyRequests = await SupportRequest.aggregate([
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
    ]);

    // Get location distribution
    const locations = await SupportRequest.aggregate([
      { $match: { location: { $exists: true, $ne: null, $ne: "" } } },
      { $group: { _id: "$location", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.render("admin/analytics", {
      totalRequests,
      deviceTypes,
      urgencyLevels,
      avgRating,
      monthlyRequests,
      locations,
      viewOnly: true,
      user: req.session.user,
      isAdmin: true,
      isMaster: false,
      currentPage: "analytics",
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).render("error", { error: "Error loading analytics" });
  }
});

// === Изменение типа аккаунта пользователя (только для админов) ===
router.post("/users/:id/change-role", async (req, res) => {
  try {
    const { newRole } = req.body; // newRole: 'customer', 'admin', 'master'
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    // Сбросить все роли
    user.isAdmin = false;
    user.isMaster = false;
    // Установить новую роль
    if (newRole === "admin") {
      user.isAdmin = true;
    } else if (newRole === "master") {
      user.isMaster = true;
    }
    // Если newRole === 'customer', обе роли останутся false
    await user.save();
    res.json({ success: true, message: `User role updated to ${newRole}` });
  } catch (error) {
    console.error("Change user role error:", error);
    res.status(500).json({ success: false, error: "Error updating user role" });
  }
});

// DISABLED ROUTES FOR ADMIN ROLE
// All edit/delete routes return 403 for admin role

router.get("/customers/:id/edit", (req, res) => {
  res.status(403).render("error", {
    error:
      "Edit functionality is disabled for admin role. Contact a Master administrator.",
  });
});

router.post("/customers/:id", (req, res) => {
  res.status(403).render("error", {
    error:
      "Edit functionality is disabled for admin role. Contact a Master administrator.",
  });
});

router.delete("/customers/:id", (req, res) => {
  res.status(403).render("error", {
    error:
      "Delete functionality is disabled for admin role. Contact a Master administrator.",
  });
});

router.post("/support/:id", (req, res) => {
  res.status(403).render("error", {
    error:
      "Edit functionality is disabled for admin role. Contact a Master administrator.",
  });
});

router.get("/parts/new", (req, res) => {
  res.status(403).render("error", {
    error:
      "Add functionality is disabled for admin role. Contact a Master administrator.",
  });
});

router.post("/parts", (req, res) => {
  res.status(403).render("error", {
    error:
      "Edit functionality is disabled for admin role. Contact a Master administrator.",
  });
});

router.get("/parts/:id/edit", (req, res) => {
  res.status(403).render("error", {
    error:
      "Edit functionality is disabled for admin role. Contact a Master administrator.",
  });
});

router.post("/parts/:id", (req, res) => {
  res.status(403).render("error", {
    error:
      "Edit functionality is disabled for admin role. Contact a Master administrator.",
  });
});

router.delete("/parts/:id", (req, res) => {
  res.status(403).render("error", {
    error:
      "Delete functionality is disabled for admin role. Contact a Master administrator.",
  });
});

router.get("customer/support-form", (req, res) => {
  res.render("customer/support-form", {
    // ...другие переменные...
    deviceType: "",
  });
});

// === Добавить POST-роут для изменения статуса заявки ===
router.post("/support/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const supportRequest = await SupportRequest.findById(req.params.id);
    if (!supportRequest) {
      return res
        .status(404)
        .render("error", { error: "Support request not found" });
    }
    supportRequest.status = status;
    await supportRequest.save();
    res.redirect(`/admin/support/${supportRequest._id}`);
  } catch (error) {
    console.error("Update support request status error:", error);
    res
      .status(500)
      .render("error", { error: "Error updating support request status" });
  }
});

export const adminRoutes = router;
