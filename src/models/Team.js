import mongoose from "mongoose";

const { Schema } = mongoose;

const TeamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    supervisors: [{ type: Schema.Types.ObjectId, ref: "User" }],
    riders: [{ type: Schema.Types.ObjectId, ref: "User" }],
    cooks: [{ type: Schema.Types.ObjectId, ref: "User" }],

  },
  { timestamps: true }
);

// Lightweight guard: enforce members’ roles at DB level (best-effort)
TeamSchema.pre("save", async function (next) {
  const User = (await import("./User.js")).default || (await import("./User.js")).User;
  const checkRole = async (ids, role) => {
    if (!ids?.length) return;
    const count = await User.countDocuments({ _id: { $in: ids }, role });
    if (count !== ids.length) {
      return next(new Error(`One or more ${role} IDs are invalid or have a different role`));
    }
  };
  await checkRole(this.supervisors, "supervisor");
  await checkRole(this.riders, "rider");
  await checkRole(this.cooks, "cook");
  next();
});

export const Team = mongoose.model("Team", TeamSchema);
