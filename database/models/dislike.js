import mongoose from "mongoose";

let dislikeSchema = new mongoose.Schema(
  {
    mediaType: String,
    mediaId: mongoose.Types.ObjectId,
    username: String,
  },
  { timestamps: true }
);

dislikeSchema.index({ mediaType: 1 });
dislikeSchema.index({ username: 1 });
dislikeSchema.index({ mediaId: 1 });

export default mongoose.model("dislike", dislikeSchema);
