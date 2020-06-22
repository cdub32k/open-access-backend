import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import rimraf from "rimraf";
import fs from "fs";
import multer from "multer";
import pubsub from "../PubSub";
import {
  VIDEO_MEDIA_TYPE_ID,
  NEWSFEED_VIDEO_SUBSCRIPTION_PREFIX,
} from "../constants";
import { deleteReplies, parseHashtags } from "../utils/helpers";

import sharp from "sharp";

import aws from "aws-sdk";
aws.config.region = "us-west-1";
const s3 = new aws.S3();
const S3_BUCKET = process.env.S3_BUCKET;

const { Media, View, Like, Dislike, Comment, User } = require("../database");

const router = require("express").Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const path = `tmp/uploads/vid/${req.username}`;
    if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
    cb(null, path);
  },
  filename: (req, file, cb) => {
    var filename = file.originalname;
    var fileExtension = filename.split(".")[filename.split(".").length - 1];
    cb(null, Date.now() + "." + fileExtension);
  },
});
const upload = multer({ storage }).fields([{ name: "thumb", maxCount: 1 }]);

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

    let s3Params = {
      Bucket: S3_BUCKET,
      Key: `vid/${req.username}/thumb-${req.files["thumb"][0].filename}`,
      Body: await img
        .png({
          progressive: true,
          compressionLevel: 6,
          adaptiveFiltering: true,
        })
        .jpeg({
          progressive: true,
          compressionLevel: 6,
          adaptiveFiltering: true,
        })
        .toBuffer(),
      ACL: "public-read",
    };

    await s3.upload(s3Params).promise();

    rimraf(`tmp/uploads/vid/${req.username}`, (err) => {});

    const video = await Media.create({
      mediaType: VIDEO_MEDIA_TYPE_ID,
      username,
      url: req.body.videoUrl,
      thumbUrl: `https://${S3_BUCKET}.s3.amazonaws.com/vid/${req.username}/thumb-${req.files["thumb"][0].filename}`,
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
    rimraf(`tmp/uploads/vid/${req.username}`, (err) => {});
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
    res.status(500).send({ error: "Something went wrong" });
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
      ] = `https://${S3_BUCKET}.s3.amazonaws.com/vid/${req.username}/thumb-${req.files["thumb"][0].filename}`;

      let img = sharp(req.files["thumb"][0].path);
      const metaData = await img.metadata();

      if (metaData.width > 856) {
        img = await img.resize(856, 482);
      }

      let s3Params = {
        Bucket: S3_BUCKET,
        Key: `vid/${req.username}/thumb-${req.files["thumb"][0].filename}`,
        Body: await img
          .png({
            progressive: true,
            compressionLevel: 6,
            adaptiveFiltering: true,
          })
          .jpeg({
            progressive: true,
            compressionLevel: 6,
            adaptiveFiltering: true,
          })
          .toBuffer(),
        ACL: "public-read",
      };
      let s3Params2 = {
        Bucket: S3_BUCKET,
        Key: `${video.thumbUrl.substring(
          video.thumbUrl.indexOf("s3.amazonaws.com/") +
            "s3.amazonaws.com/".length
        )}`,
      };

      await Promise.all([
        s3.upload(s3Params).promise(),
        s3.deleteObject(s3Params2).promise(),
      ]);

      rimraf(`tmp/uploads/vid/${req.username}`, (err) => {});
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

    let s3Params = {
      Bucket: S3_BUCKET,
      Key: `${video.url.substring(
        video.url.indexOf("s3.amazonaws.com/") + "s3.amazonaws.com/".length
      )}`,
    };
    let s3Params2 = {
      Bucket: S3_BUCKET,
      Key: `${video.thumbUrl.substring(
        video.thumbUrl.indexOf("s3.amazonaws.com/") + "s3.amazonaws.com/".length
      )}`,
    };

    await Promise.all([
      s3.deleteObject(s3Params).promise(),
      s3.deleteObject(s3Params2).promise(),
      Like.deleteMany({
        mediaId: video._id,
        mediaType: VIDEO_MEDIA_TYPE_ID,
      }),
      Dislike.deleteMany({
        mediaId: video._id,
        mediaType: VIDEO_MEDIA_TYPE_ID,
      }),
      Comment.deleteMany({
        mediaId: video._id,
        mediaType: VIDEO_MEDIA_TYPE_ID,
      }),
      View.deleteMany({
        mediaId: video._id,
        mediaType: VIDEO_MEDIA_TYPE_ID,
      }),
      video.delete(),
    ]);

    return res.status(200).send(true);
  } catch (e) {
    res.status(500).send({ error: "Something went wrong" });
  }
});

export default router;
