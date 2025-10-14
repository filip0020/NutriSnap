import { Router } from "express";
import {
  register,
  login,
  logout,
  verifyToken,
  updateProfile,
} from "../controllers/authController";
import protect from "../middleware/auth";

const router = Router();

// Public routes - NO authentication required
router.post("/register", register);
router.post("/login", login);

// Protected routes - authentication required
router.post("/logout", protect, logout);
router.get("/verify", protect, verifyToken);
router.put("/profile", protect, updateProfile);

// Debug route (remove in production)
router.get("/test", (req, res) => {
  res.json({
    message: "Auth routes working",
    timestamp: new Date().toISOString(),
    routes: [
      "POST /api/auth/register",
      "POST /api/auth/login",
      "POST /api/auth/logout (protected)",
      "GET /api/auth/verify (protected)",
      "PUT /api/auth/profile (protected)",
    ]
  });
});

export default router;