import mongoose, { type InferSchemaType, type Model, type Types } from "mongoose"

// The site owner's account — the only account. There is no sign-up
// route; this record is created and reset only by `npm run admin` (which
// needs database access). Sign-in additionally requires the email to match
// the ADMIN_EMAIL environment variable.
const adminSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        name: { type: String, trim: true, default: "" },
        // bcrypt hash; never selected unless asked for explicitly.
        passwordHash: { type: String, required: true, select: false },
        // Bumped to revoke every existing session (password change,
        // "sign out everywhere", CLI reset).
        sessionVersion: { type: Number, default: 1 },
        passwordChangedAt: { type: Date, default: null },

        // Durable brute-force protection (survives restarts, unlike the
        // per-instance IP throttle).
        failedLoginCount: { type: Number, default: 0 },
        lockedUntil: { type: Date, default: null },

        lastLoginAt: { type: Date, default: null },
        lastLoginIpHash: { type: String, default: "" },
    },
    { timestamps: true }
)

export type Admin = InferSchemaType<typeof adminSchema> & { _id: Types.ObjectId }

const AdminModel = (mongoose.models.Admin as Model<Admin>) || mongoose.model<Admin>("Admin", adminSchema, "admins")
export default AdminModel
