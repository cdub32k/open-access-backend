import mongoose from "mongoose";

let userSchema = new mongoose.Schema(
  {
    profilePic: String,
    smallPic: String,
    username: {
      type: String,
      unique: true,
    },
    email: String,
    displayName: String,
    phoneNumber: String,
    bio: String,
    passwordHash: String,
    stripeCustomerId: String,
    stripePaymentMethodId: String,
    active: Boolean,
    activeUntil: Date,
    tempKey: String,
    tempKeyIssuedAt: Date,
  },
  { timestamps: { createdAt: "joinedAt" } }
);

userSchema.index({ username: 1 });

export default mongoose.model("user", userSchema);
