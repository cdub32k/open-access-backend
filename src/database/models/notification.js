import mongoose from "mongoose";

import pubsub from "../../PubSub";
import { NOTIFICATION_SUBSCRIPTION_PREFIX } from "../../constants";

let notificationSchema = new mongoose.Schema(
  {
    sender: String,
    receiver: String,
    type: String,
    target: String,
    targetId: mongoose.Types.ObjectId,
    body: String,
    read: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    commentId: mongoose.Types.ObjectId,
  },
  { timestamps: true }
);

notificationSchema.index({ receiver: 1 });

notificationSchema.pre("save", function (done) {
  if (!this.isNew) return done();

  pubsub.publish(NOTIFICATION_SUBSCRIPTION_PREFIX + this.receiver, {
    notifications: {
      sender: this.sender,
      type: this.type,
      target: this.target,
      targetId: this.targetId,
      body: this.body,
      read: this.read,
      _id: this._id,
      createdAt: this.createdAt,
      commentId: this.commentId,
    },
  });
  done();
});

notificationSchema.index(
  { readAt: 1 },
  {
    //expireAfterSeconds: 24 * 60 * 60 * 3,
    expireAfterSeconds: 60,
    partialFilterExpression: { read: true },
  }
);

export default mongoose.model("notification", notificationSchema);
