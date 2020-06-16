import mongoose from "mongoose";

let subscriptionSchema = new mongoose.Schema(
  {
    stripeSubscriptionId: String,
    stripeCustomerId: String,
    stripePlanId: String,
    username: String,
    amount: Number,
    cycle: { type: String, default: "monthly" },
    terminated: { type: Boolean, default: false },
    terminatedAt: Date,
  },
  { timestamps: true }
);

subscriptionSchema.index({ username: 1 });

export default mongoose.model("subscription", subscriptionSchema);
