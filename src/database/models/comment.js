import mongoose from "mongoose";

import {
  parseLinks,
  stripLinks,
  convertVideoTimestampsToLinks,
} from "../../utils/helpers";

import { VIDEO_MEDIA_TYPE_ID } from "../../constants";

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

commentSchema.pre("save", async function (next) {
  try {
    if (!this.isNew) this.body = stripLinks(this.body);

    this.body = await parseLinks(
      this.body,
      this.username,
      this.mediaType,
      this.mediaId,
      this._id
    );
    if (this.mediaType == VIDEO_MEDIA_TYPE_ID)
      this.body = convertVideoTimestampsToLinks(this.mediaId, this.body);
    next();
  } catch (e) {
    next(e);
  }
});

export default mongoose.model("comment", commentSchema);
