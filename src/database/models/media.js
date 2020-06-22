import mongoose from "mongoose";
import {
  VIDEO_MEDIA_TYPE_ID,
  IMAGE_MEDIA_TYPE_ID,
  NOTE_MEDIA_TYPE_ID,
} from "../../constants";

let mediaSchema = new mongoose.Schema(
  {
    mediaType: { type: String, required: true },
    url: String,
    thumbUrl: String,
    title: String,
    caption: { type: String, required: true },
    viewCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    dislikeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    username: { type: String, required: true },
    hashtags: [String],
  },
  { timestamps: { createdAt: "uploadedAt" } }
);

mediaSchema.pre("save", function (next) {
  if (
    ((this.mediaType == VIDEO_MEDIA_TYPE_ID ||
      this.mediaType == IMAGE_MEDIA_TYPE_ID) &&
      (this.title.length > 120 || this.caption.length > 2000)) ||
    (this.mediaType == NOTE_MEDIA_TYPE_ID && this.caption.length > 800)
  ) {
    let err = new Error("field max length exceeded");
    next(err);
  } else next();
});
mediaSchema.index({ mediaType: 1 });
mediaSchema.index({ username: 1 });
mediaSchema.index({ hashtags: 1 });

export default mongoose.model("media", mediaSchema);
