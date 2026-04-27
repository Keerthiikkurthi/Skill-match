import { Router, Response } from "express";
import { z } from "zod";
import { User } from "../models/User";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().max(255).optional(),
}).refine(data => data.name !== undefined || data.email !== undefined, {
  message: "At least one field (name or email) must be provided",
});

// GET /profile
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// PATCH /profile
router.patch("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { name, email } = parsed.data;

  try {
    // Check email uniqueness
    if (email) {
      const conflict = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: req.userId },
      });
      if (conflict) {
        res.status(409).json({ error: "This email is already in use by another account." });
        return;
      }
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (email) updates.email = email.toLowerCase();

    const updated = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select("-password");
    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: updated._id.toString(),
      name: updated.name,
      email: updated.email,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
