import mongoose, { type InferSchemaType, type Model, type Types } from "mongoose"

// One pending sign-in code per challenge (the challenge id travels in a signed,
// short-lived cookie). Only an HMAC of the code is stored. Mongo's TTL monitor
// deletes expired documents automatically (it runs about once a minute, so
// expiry is also checked explicitly on read).
const adminOtpSchema = new mongoose.Schema(
    {
        admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true, index: true },
        challengeId: { type: String, required: true, unique: true },
        codeHash: { type: String, required: true },
        attempts: { type: Number, default: 0 },
        resendCount: { type: Number, default: 0 },
        lastSentAt: { type: Date, default: () => new Date() },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
)

adminOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export type AdminOtp = InferSchemaType<typeof adminOtpSchema> & { _id: Types.ObjectId }

const AdminOtpModel =
    (mongoose.models.AdminOtp as Model<AdminOtp>) || mongoose.model<AdminOtp>("AdminOtp", adminOtpSchema, "admin_otps")
export default AdminOtpModel
