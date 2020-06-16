import mongoose from "mongoose";

let likeSchema = new mongoose.Schema(
  {
    mediaId: mongoose.Types.ObjectId,
    mediaType: String,
    username: String,
  },
  { timestamps: true }
);

likeSchema.index({ mediaType: 1 });
likeSchema.index({ username: 1 });
likeSchema.index({ mediaId: 1 });

export default mongoose.model("like", likeSchema);
