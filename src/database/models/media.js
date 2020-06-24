import mongoose from "mongoose";
import {
  VIDEO_MEDIA_TYPE_ID,
  IMAGE_MEDIA_TYPE_ID,
  NOTE_MEDIA_TYPE_ID,
} from "../../constants";

import {
  parseLinks,
  stripLinks,
  convertVideoTimestampsToLinks,
} from "../../utils/helpers";

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

mediaSchema.pre("save", async function (next) {
  try {
    if (this.isNew) {
      this.caption = await parseLinks(
        this.caption,
        this.username,
        this.mediaType,
        this._id
      );

      if (this.mediaType == VIDEO_MEDIA_TYPE_ID)
        this.caption = convertVideoTimestampsToLinks(this._id, this.caption);
    }
    if (!this.isNew && this.isModified("caption")) {
      this.caption = stripLinks(this.caption);
      this.caption = await parseLinks(
        this.caption,
        this.username,
        this.mediaType,
        this._id
      );
      if (this.mediaType == VIDEO_MEDIA_TYPE_ID)
        this.caption = convertVideoTimestampsToLinks(this._id, this.caption);
    }

    if (
      ((this.mediaType == VIDEO_MEDIA_TYPE_ID ||
        this.mediaType == IMAGE_MEDIA_TYPE_ID) &&
        (this.title.length > 120 || this.caption.length > 2000)) ||
      (this.mediaType == NOTE_MEDIA_TYPE_ID && this.caption.length > 800)
    ) {
      throw new Error("field max length exceeded");
    }
    next();
  } catch (e) {
    next(e);
  }
});
mediaSchema.index({ mediaType: 1 });
mediaSchema.index({ username: 1 });
mediaSchema.index({ hashtags: 1 });

export default mongoose.model("media", mediaSchema);
