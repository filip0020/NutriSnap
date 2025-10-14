import { Response } from "express";
import jwt from "jsonwebtoken";
import User, { AuthRequest } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "secretkey";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh-secret";

// Register new user
export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log("📝 Register request received:", req.body.email);

    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      console.warn("⚠️ Missing email or password");
      res.status(400).json({
        success: false,
        message: "Email și parola sunt obligatorii"
      });
      return;
    }

    if (password.length < 6) {
      console.warn("⚠️ Password too short");
      res.status(400).json({
        success: false,
        message: "Parola trebuie să aibă minimum 6 caractere"
      });
      return;
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.warn("⚠️ User already exists:", email);
      res.status(409).json({
        success: false,
        message: "Email-ul este deja înregistrat"
      });
      return;
    }

    // Create user - password will be hashed automatically by pre-save hook
    const user = await User.create({
      email: email.toLowerCase(),
      password: password, // Don't hash here - model does it automatically
      caloriesTarget: 2000,
      activityLevel: 1.2,
    });

    console.log("✅ User created:", user.email);

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user._id.toString(), email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const refreshToken = jwt.sign(
      { id: user._id.toString() },
      JWT_REFRESH_SECRET,
      { expiresIn: "30d" }
    );

    console.log("✅ Tokens generated for:", user.email);

    // Return response
    res.status(201).json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        caloriesTarget: user.caloriesTarget,
        activityLevel: user.activityLevel,
      },
    });
  } catch (error: any) {
    console.error("❌ Register error:", error);
    res.status(500).json({
      success: false,
      message: "Eroare la înregistrare",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Login user
export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log("🔐 Login request received:", req.body.email);

    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email și parola sunt obligatorii"
      });
      return;
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.warn("⚠️ User not found:", email);
      res.status(401).json({
        success: false,
        message: "Email sau parolă incorectă"
      });
      return;
    }

    // Check password using comparePassword method from model
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      console.warn("⚠️ Invalid password for:", email);
      res.status(401).json({
        success: false,
        message: "Email sau parolă incorectă"
      });
      return;
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user._id.toString(), email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const refreshToken = jwt.sign(
      { id: user._id.toString() },
      JWT_REFRESH_SECRET,
      { expiresIn: "30d" }
    );

    console.log("✅ Login successful:", user.email);

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        caloriesTarget: user.caloriesTarget,
        activityLevel: user.activityLevel,
      },
    });
  } catch (error: any) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      success: false,
      message: "Eroare la autentificare",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Logout user
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log("👋 Logout request");

    res.json({
      success: true,
      message: "Logout reușit"
    });
  } catch (error: any) {
    console.error("❌ Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Eroare la logout"
    });
  }
};

// Verify token
export const verifyToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // User is already attached by middleware
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Token invalid"
      });
      return;
    }

    console.log("✅ Token verified for:", user.email);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        caloriesTarget: user.caloriesTarget,
        activityLevel: user.activityLevel,
      },
    });
  } catch (error: any) {
    console.error("❌ Verify token error:", error);
    res.status(401).json({
      success: false,
      message: "Token invalid"
    });
  }
};

// Update user profile
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Neautorizat"
      });
      return;
    }

    const { caloriesTarget, activityLevel } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "Utilizator negăsit"
      });
      return;
    }

    if (caloriesTarget !== undefined) {
      user.caloriesTarget = caloriesTarget;
    }
    if (activityLevel !== undefined) {
      user.activityLevel = activityLevel;
    }

    await user.save();

    console.log("✅ Profile updated:", user.email);

    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        caloriesTarget: user.caloriesTarget,
        activityLevel: user.activityLevel,
      },
    });
  } catch (error: any) {
    console.error("❌ Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Eroare la actualizarea profilului"
    });
  }
};