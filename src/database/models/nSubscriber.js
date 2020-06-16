import mongoose from "mongoose";

let nSubSchema = new mongoose.Schema(
  {
    email: String,
  },
  { timestamps: true }
);

export default mongoose.model("nSub", nSubSchema);
