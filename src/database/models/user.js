import mongoose from "mongoose";
import { parseLinks, stripLinks } from "../../utils/helpers";

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
  { timestamps: { createdAt: "joinedAt" }, capped: { max: 5000 } }
);

userSchema.index({ username: 1 });

userSchema.pre("save", async function (next) {
  try {
    if (this.isNew) {
      if (this.bio.length > 800) throw new Error("field max length exceeded");
    }

    if (!this.isNew) this.bio = stripLinks(this.bio);

    if (this.bio.length > 800) throw new Error("field max length exceeded");

    this.bio = await parseLinks(this.bio, this.username);
  } catch (e) {}
});

export default mongoose.model("user", userSchema);
