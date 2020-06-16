import mongoose from "mongoose";

let chargeSchema = new mongoose.Schema(
  {
    stripePaymentIntentId: String,
    stripePaymentMethodId: String,
    username: String,
    amount: Number,
    refunded: { type: Boolean, default: false },
    refundedAt: Date,
  },
  { timestamps: true }
);

chargeSchema.index({ username: 1 });

export default mongoose.model("charge", chargeSchema);
