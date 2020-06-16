import mongoose from "mongoose";

let viewSchema = new mongoose.Schema(
  {
    type: String,
    mediaId: mongoose.Types.ObjectId,
    mediaType: String,
    username: String,
  },
  { timestamps: true }
);

viewSchema.index({ type: 1 });
viewSchema.index({ username: 1 });
viewSchema.index({ mediaId: 1 });
viewSchema.index({ mediaType: 1 });

export default mongoose.model("view", viewSchema);
