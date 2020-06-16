import mongoose from "mongoose";

let mediaSchema = new mongoose.Schema(
  {
    mediaType: String,
    url: String,
    thumbUrl: String,
    title: String,
    caption: String,
    viewCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    dislikeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    username: String,
    hashtags: [String],
  },
  { timestamps: { createdAt: "uploadedAt" } }
);

mediaSchema.index({ mediaType: 1 });
mediaSchema.index({ username: 1 });
mediaSchema.index({ hashtags: 1 });

export default mongoose.model("media", mediaSchema);
