import mongoose from "mongoose";

let commentDislikeSchema = new mongoose.Schema(
  {
    mediaType: String,
    mediaId: mongoose.Types.ObjectId,
    commentId: mongoose.Types.ObjectId,
    username: String,
  },
  { timestamps: true }
);

commentDislikeSchema.index({ mediaType: 1 });
commentDislikeSchema.index({ commentId: 1 });

export default mongoose.model("comment_dislike", commentDislikeSchema);
