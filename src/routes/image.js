import dotenv from "dotenv";
dotenv.config();

import sharp from "sharp";

import fs from "fs";
import multer from "multer";
import pubsub from "../PubSub";
import {
  IMAGE_MEDIA_TYPE_ID,
  NEWSFEED_IMAGE_SUBSCRIPTION_PREFIX,
} from "../constants";
import { deleteReplies, parseHashtags } from "../utils/helpers";

const { Media, Like, Dislike, Comment, User } = require("../database");

const router = require("express").Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const path = `public/img/${req.username}`;
    cb(null, path);
  },
  filename: (req, file, cb) => {
    var filename = file.originalname;
    var fileExtension = filename.split(".")[filename.split(".").length - 1];
    cb(null, Date.now() + "." + fileExtension);
  },
});

const upload = multer({ storage }).fields([{ name: "image", maxCount: 1 }]);

router.post("/upload", upload, async (req, res) => {
  try {
    const username = req.username;

    let hashtags = parseHashtags(req.body.title).concat(
      parseHashtags(req.body.caption)
    );

    let img = sharp(req.files["image"][0].path);
    const metaData = await img.metadata();

    if (metaData.width > 856) {
      img = await img.resize(856, 856);
    }
    img.toFile(
      `public/img/${req.username}/thumb-${req.files["image"][0].filename}`
    );

    const image = await Media.create({
      mediaType: IMAGE_MEDIA_TYPE_ID,
      username,
      url: `http://localhost:5000/img/${req.username}/thumb-${req.files["image"][0].filename}`,
      title: req.body.title,
      caption: req.body.caption,
      hashtags,
    });

    let profilePic = await User.findOne({ username }).profilePic;

    let user = { username, profilePic };
    image.user = user;
    pubsub.publish(NEWSFEED_IMAGE_SUBSCRIPTION_PREFIX, {
      newsfeedImages: image,
    });

    return res.send({ image: { _id: image._id } });
  } catch (error) {
    return res.status(500).send({ error: "Something went wrong" });
  }
});

const profStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const path = `public/img/${req.username}`;
    cb(null, path);
  },
  filename: (req, file, cb) => {
    var filename = file.originalname;
    var fileExtension = filename.split(".")[filename.split(".").length - 1];
    cb(null, "profile." + fileExtension);
  },
});

const profUpload = multer({ storage: profStorage }).fields([
  { name: "image", maxCount: 1 },
]);

router.post("/profile/upload", profUpload, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.username });

    let img = sharp(req.files["image"][0].path);
    const metaData = await img.metadata();

    let small = await img.resize(98, 98);
    small.toFile(
      `public/img/${req.username}/small-thumb-${req.files["image"][0].filename}`
    );

    if (metaData.width > 856) {
      img = await img.resize(856, 856);
    }

    img.toFile(
      `public/img/${req.username}/thumb-${req.files["image"][0].filename}`
    );

    user.profilePic = `http://localhost:5000/img/${req.username}/thumb-${req.files["image"][0].filename}`;
    user.smallPic = `http://localhost:5000/img/${req.username}/small-thumb-${req.files["image"][0].filename}`;
    await user.save();

    res.send({ user });
  } catch (error) {
    return res.status(500).send({ error: "Something went wrong" });
  }
});

router.put("/comments/:id", async (req, res) => {
  try {
    await Comment.updateOne(
      { _id: req.params.id, mediaType: IMAGE_MEDIA_TYPE_ID },
      { body: req.body.body }
    );

    return res.status(200).send(true);
  } catch (e) {
    res.status(500).send({ error: "Something went wrong" });
  }
});

router.delete("/comments/:id", async (req, res) => {
  try {
    const iComment = await Comment.findOne({
      _id: req.params.id,
      mediaType: IMAGE_MEDIA_TYPE_ID,
    });
    let image = await Media.findOne({
      _id: iComment.imageId,
      mediaType: IMAGE_MEDIA_TYPE_ID,
    });
    let totalDecr = 1;
    if (iComment) {
      if (iComment.replyId) {
        const rComment = await Comment.findOne({
          _id: iComment.replyId,
          mediaType: IMAGE_MEDIA_TYPE_ID,
        });
        rComment.replyCount--;
        await rComment.save();
      }

      totalDecr += await deleteReplies(Comment, iComment, image);

      await iComment.delete();
    }
    image.update({ $inc: { commentCount: -totalDecr } });
    return res.status(200).send({
      createdAt: image.createdAt,
      commentCount: image.commentCount - totalDecr,
    });
  } catch (e) {
    res.status(500).send({ error: "Something went wrong" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    let hashtags = parseHashtags(req.body.title).concat(
      parseHashtags(req.body.caption)
    );
    await Media.updateOne(
      { _id: req.params.id, mediaType: IMAGE_MEDIA_TYPE_ID },
      { title: req.body.title, caption: req.body.caption, hashtags }
    );

    return res.status(200).send(true);
  } catch (e) {
    res.status(500).send({ error: "Something went wrong" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const image = await Media.findOne({
      _id: req.params.id,
      mediaType: IMAGE_MEDIA_TYPE_ID,
    });

    fs.unlink(`public/${image.url.split("5000/")[1]}`);
    //fs.unlink(`public/${image.thumbUrl.split("5000/")[1]}`);

    await Like.deleteMany({
      mediaId: image._id,
      mediaType: IMAGE_MEDIA_TYPE_ID,
    });
    await Dislike.deleteMany({
      mediaId: image._id,
      mediaType: IMAGE_MEDIA_TYPE_ID,
    });
    await Comment.deleteMany({
      mediaId: image._id,
      mediaType: IMAGE_MEDIA_TYPE_ID,
    });
    await image.delete();

    return res.status(200).send(true);
  } catch (e) {
    res.status(500).send({ error: "Something went wrong" });
  }
});

export default router;
