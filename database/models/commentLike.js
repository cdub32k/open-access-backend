import mongoose from "mongoose";

let commentLikeSchema = new mongoose.Schema(
  {
    mediaType: String,
    mediaId: mongoose.Types.ObjectId,
    commentId: mongoose.Types.ObjectId,
    username: String,
  },
  { timestamps: true }
);

commentLikeSchema.index({ mediaType: 1 });
commentLikeSchema.index({ commentId: 1 });

export default mongoose.model("comment_like", commentLikeSchema);
