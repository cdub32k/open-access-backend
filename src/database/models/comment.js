import mongoose from "mongoose";

let commentSchema = new mongoose.Schema(
  {
    mediaType: String,
    mediaId: mongoose.Types.ObjectId,
    body: String,
    username: String,
    replyId: mongoose.Types.ObjectId,
    replyCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    dislikeCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

commentSchema.index({ mediaType: 1 });
commentSchema.index({ mediaId: 1 });
commentSchema.index({ username: 1 });

export default mongoose.model("comment", commentSchema);
