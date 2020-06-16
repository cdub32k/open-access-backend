import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import multer from "multer";
import pubsub from "../PubSub";
import {
  VIDEO_MEDIA_TYPE_ID,
  NEWSFEED_VIDEO_SUBSCRIPTION_PREFIX,
} from "../constants";
import { deleteReplies, parseHashtags } from "../utils/helpers";

import sharp from "sharp";

const { Media, View, Like, Dislike, Comment, User } = require("../database");

const router = require("express").Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const path = `public/vid/${req.username}`;
    cb(null, path);
  },
  filename: (req, file, cb) => {
    var filename = file.originalname;
    var fileExtension = filename.split(".")[filename.split(".").length - 1];
    cb(null, Date.now() + "." + fileExtension);
  },
});
const upload = multer({ storage }).fields([
  { name: "video", maxCount: 1 },
  { name: "thumb", maxCount: 1 },
]);

router.post("/upload", upload, async (req, res) => {
  try {
    const username = req.username;

    let hashtags = parseHashtags(req.body.title).concat(
      parseHashtags(req.body.caption)
    );

    let img = sharp(req.files["thumb"][0].path);
    const metaData = await img.metadata();

    if (metaData.width > 856) {
      img = await img.resize(856, 482);
    }
    img.toFile(
      `public/vid/${req.username}/thumb-${req.files["thumb"][0].filename}`
    );

    const video = await Media.create({
      mediaType: VIDEO_MEDIA_TYPE_ID,
      username,
      url: `http://localhost:5000/vid/${req.username}/${req.files["video"][0].filename}`,
      thumbUrl: `http://localhost:5000/vid/${req.username}/thumb-${req.files["thumb"][0].filename}`,
      title: req.body.title,
      caption: req.body.caption,
      hashtags,
    });

    let profilePic = await User.findOne({ username })
      .select({ profilePic: 1 })
      .lean().profilePic;

    let user = { username, profilePic };
    video.user = user;
    pubsub.publish(NEWSFEED_VIDEO_SUBSCRIPTION_PREFIX, {
      newsfeedVideos: video,
    });

    return res.send({ video: { _id: video._id } });
  } catch (error) {
    return res.status(500).send({ error: "Something went wrong" });
  }
});

router.put("/comments/:id", async (req, res) => {
  try {
    await Comment.updateOne(
      { _id: req.params.id, mediaType: VIDEO_MEDIA_TYPE_ID },
      { body: req.body.body }
    );

    return res.status(200).send(true);
  } catch (e) {
    res.status(500).send({ error: "Something went wrong" });
  }
});

router.delete("/comments/:id", async (req, res) => {
  try {
    const vComment = await Comment.findOne({
      _id: req.params.id,
      mediaType: VIDEO_MEDIA_TYPE_ID,
    });
    let video = await Media.findOne({
      _id: vComment.mediaId,
      mediaType: VIDEO_MEDIA_TYPE_ID,
    });
    let totalDecr = 1;
    if (vComment) {
      if (vComment.replyId) {
        const rComment = await Comment.findOne({
          _id: vComment.replyId,
          mediaType: VIDEO_MEDIA_TYPE_ID,
        });
        rComment.replyCount--;
        await rComment.save();
      }

      totalDecr += await deleteReplies(Comment, vComment, video);

      await vComment.delete();
    }
    await video.update({ $inc: { commentCount: -totalDecr } });
    return res.status(200).send({
      createdAt: video.createdAt,
      commentCount: video.commentCount - totalDecr,
    });
  } catch (e) {
    res.status(500).send({ error: "Something went wrong" + e });
  }
});
router.put("/:id", upload, async (req, res) => {
  try {
    let video = await Media.findOne({
      _id: req.params.id,
      mediaType: VIDEO_MEDIA_TYPE_ID,
    });

    let hashtags = parseHashtags(req.body.title).concat(
      parseHashtags(req.body.caption)
    );

    let criteria = {
      title: req.body.title,
      caption: req.body.caption,
      hashtags,
    };
    if (req.files && req.files["thumb"]) {
      criteria[
        "thumbUrl"
      ] = `http://localhost:5000/vid/${req.username}/${req.files["thumb"][0].filename}`;
      fs.unlink(`public/${video.thumbUrl.split("5000/")[1]}`);
    }
    await video.update(criteria);

    return res.status(200).send(true);
  } catch (e) {
    res.status(500).send({ error: "Something went wrong" });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    const video = await Media.findOne({
      _id: req.params.id,
      mediaType: VIDEO_MEDIA_TYPE_ID,
    });

    fs.unlink(`public/${video.url.split("5000/")[1]}`);
    fs.unlink(`public/${video.thumbUrl.split("5000/")[1]}`);

    await Like.deleteMany({
      mediaId: video._id,
      mediaType: VIDEO_MEDIA_TYPE_ID,
    });
    await Dislike.deleteMany({
      mediaId: video._id,
      mediaType: VIDEO_MEDIA_TYPE_ID,
    });
    await Comment.deleteMany({
      mediaId: video._id,
      mediaType: VIDEO_MEDIA_TYPE_ID,
    });
    await View.deleteMany({
      mediaId: video._id,
      mediaType: VIDEO_MEDIA_TYPE_ID,
    });
    await video.delete();

    return res.status(200).send(true);
  } catch (e) {
    res.status(500).send({ error: "Something went wrong" });
  }
});

export default router;
