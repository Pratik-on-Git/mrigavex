import mongoose, { type InferSchemaType, type Model, type Types } from "mongoose"
import { INQUIRY_TYPE_VALUES, LEAD_LIMITS, LEAD_SOURCES, LEAD_STATUS_VALUES } from "@/lib/leadConfig"

// A contact-form submission. Soft delete: `deletedAt` null = live, set = in
// trash; permanent deletion removes the document (only from trash).
const leadSchema = new mongoose.Schema(
    {
        // Human reference shown to the owner and in emails (MX-XXXXXXXX).
        ticketId: { type: String, required: true, unique: true },

        name: { type: String, required: true, trim: true, maxlength: LEAD_LIMITS.nameMax },
        email: { type: String, required: true, lowercase: true, trim: true, maxlength: LEAD_LIMITS.emailMax },
        organisation: { type: String, trim: true, default: "", maxlength: LEAD_LIMITS.organisationMax },
        phone: { type: String, trim: true, default: "", maxlength: LEAD_LIMITS.phoneMax },
        inquiryType: { type: String, enum: INQUIRY_TYPE_VALUES, required: true },
        message: { type: String, required: true, maxlength: LEAD_LIMITS.messageMax },
        // Which practice area link sent them to the form, if any.
        source: { type: String, enum: [...LEAD_SOURCES, ""], default: "" },

        status: { type: String, enum: LEAD_STATUS_VALUES, default: "new" },
        statusHistory: {
            type: [{ _id: false, status: { type: String, enum: LEAD_STATUS_VALUES }, at: Date }],
            default: [],
        },
        adminNotes: { type: String, default: "", maxlength: LEAD_LIMITS.notesMax },
        isRead: { type: Boolean, default: false },
        readAt: { type: Date, default: null },

        // Duplicate guard: hash of email + normalised message.
        fingerprint: { type: String, required: true },
        // Abuse trail without storing the raw IP.
        ipHash: { type: String, default: "" },
        userAgent: { type: String, default: "", maxlength: 300 },

        // Outcome of the "new lead" email to the owner (best effort).
        notifiedAt: { type: Date, default: null },
        notifyError: { type: String, default: "" },

        deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
)

leadSchema.index({ deletedAt: 1, createdAt: -1 })
leadSchema.index({ deletedAt: 1, isRead: 1 })
leadSchema.index({ deletedAt: 1, status: 1 })
leadSchema.index({ fingerprint: 1, createdAt: -1 })
leadSchema.index({ ipHash: 1, createdAt: -1 })

export type Lead = InferSchemaType<typeof leadSchema> & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date }

const LeadModel = (mongoose.models.Lead as Model<Lead>) || mongoose.model<Lead>("Lead", leadSchema, "leads")
export default LeadModel
