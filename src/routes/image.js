import dotenv from "dotenv";
dotenv.config();

import sharp from "sharp";
import axios from "axios";
import fs from "fs";
import rimraf from "rimraf";
import multer from "multer";
import pubsub from "../PubSub";

import aws from "aws-sdk";
aws.config.region = "us-west-1";
const s3 = new aws.S3();
const S3_BUCKET = process.env.S3_BUCKET;

import {
  IMAGE_MEDIA_TYPE_ID,
  NEWSFEED_IMAGE_SUBSCRIPTION_PREFIX,
} from "../constants";
import { deleteReplies, parseHashtags } from "../utils/helpers";

const {
  Media,
  Like,
  Dislike,
  Comment,
  CommentLike,
  CommentDislike,
  User,
} = require("../database");

const router = require("express").Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const path = `tmp/uploads/img/${req.username}`;
    if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
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

    let hashtags = [
      ...new Set(
        parseHashtags(req.body.title).concat(parseHashtags(req.body.caption))
      ),
    ];

    let img = sharp(req.files["image"][0].path);
    const metaData = await img.metadata();

    if (metaData.width > 856) {
      img = await img.resize(856, 856);
    }

    let s3Params = {
      Bucket: S3_BUCKET,
      Key: `img/${req.username}/thumb-${req.files["image"][0].filename}`,
      Body: await img
        .png({
          progressive: true,
          compressionLevel: 8,
          adaptiveFiltering: true,
        })
        .jpeg({
          progressive: true,
          compressionLevel: 8,
          adaptiveFiltering: true,
        })
        .toBuffer(),
      ACL: "public-read",
    };

    await s3.upload(s3Params).promise();
    await rimraf(`tmp/uploads/img/${req.username}`, (err) => {});

    const image = await Media.create({
      mediaType: IMAGE_MEDIA_TYPE_ID,
      username,
      url: `https://${S3_BUCKET}.s3.amazonaws.com/img/${req.username}/thumb-${req.files["image"][0].filename}`,
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
    const path = `tmp/uploads/img/${req.username}`;
    if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
    cb(null, path);
  },
  filename: (req, file, cb) => {
    var filename = file.originalname;
    var fileExtension = filename.split(".")[filename.split(".").length - 1];
    cb(null, "profile." + Date.now() + "." + fileExtension);
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
    if (metaData.width > 856) {
      img = await img.resize(856, 856);
    }

    let small = await sharp(req.files["image"][0].path).resize(98, 98);

    //delete old pics
    if (user.profilePic) {
      let s3Params3 = {
        Bucket: S3_BUCKET,
        Key: `${user.profilePic.substring(
          user.profilePic.indexOf("s3.amazonaws.com/") +
            "s3.amazonaws.com/".length
        )}`,
      };
      let s3Params4 = {
        Bucket: S3_BUCKET,
        Key: `${user.smallPic.substring(
          user.smallPic.indexOf("s3.amazonaws.com/") +
            "s3.amazonaws.com/".length
        )}`,
      };

      await Promise.all([
        s3.deleteObject(s3Params3).promise(),
        s3.deleteObject(s3Params4).promise(),
      ]);
    }

    //create new pics
    let s3Params = {
      Bucket: S3_BUCKET,
      Key: `img/${req.username}/thumb-${req.files["image"][0].filename}`,
      Body: await img
        .png({
          progressive: true,
          compressionLevel: 8,
          adaptiveFiltering: true,
        })
        .jpeg({
          progressive: true,
          compressionLevel: 8,
          adaptiveFiltering: true,
        })
        .toBuffer(),
      ACL: "public-read",
    };
    let s3Params2 = {
      Bucket: S3_BUCKET,
      Key: `img/${req.username}/small-thumb-${req.files["image"][0].filename}`,
      Body: await small
        .png({
          progressive: true,
          compressionLevel: 8,
          adaptiveFiltering: true,
        })
        .jpeg({
          progressive: true,
          compressionLevel: 8,
          adaptiveFiltering: true,
        })
        .toBuffer(),
      ACL: "public-read",
    };

    await Promise.all([
      s3.upload(s3Params).promise(),
      s3.upload(s3Params2).promise(),
    ]);

    await rimraf(`tmp/uploads/img/${req.username}`, (err) => {});

    user.profilePic = `https://${S3_BUCKET}.s3.amazonaws.com/img/${req.username}/thumb-${req.files["image"][0].filename}`;
    user.smallPic = `https://${S3_BUCKET}.s3.amazonaws.com/img/${req.username}/small-thumb-${req.files["image"][0].filename}`;
    await user.save();

    res.send({ user });
  } catch (error) {
    return res.status(500).send({ error: "Something went wrong" });
  }
});

router.put("/comments/:id", async (req, res) => {
  try {
    let c = await Comment.findOne({
      _id: req.params.id,
      mediaType: IMAGE_MEDIA_TYPE_ID,
    });
    c.body = req.body.body;
    await c.save();

    return res.status(200).send(true);
  } catch (e) {
    res.status(500).send({ error: "Something went wrong" });
  }
});

export async function deleteImageComment(id) {
  const iComment = await Comment.findOne({
    _id: id,
    mediaType: IMAGE_MEDIA_TYPE_ID,
  });
  let image = await Media.findOne({
    _id: iComment.mediaId,
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

    await Promise.all([
      iComment.delete(),
      CommentLike.deleteMany({ commentId: id }),
      CommentDislike.deleteMany({ commentId: id }),
    ]);
  }
  image.update({ $inc: { commentCount: -totalDecr } });

  return image.commentCount - totalDecr;
}

router.delete("/comments/:id", async (req, res) => {
  try {
    let commentCount = await deleteImageComment(req.params.id);

    return res.status(200).send({
      commentCount,
    });
  } catch (e) {
    res.status(500).send({ error: "Something went wrong" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    let hashtags = [
      ...new Set(
        parseHashtags(req.body.title).concat(parseHashtags(req.body.caption))
      ),
    ];
    let m = await Media.findOne({
      _id: req.params.id,
      mediaType: IMAGE_MEDIA_TYPE_ID,
    });

    m.title = req.body.title;
    m.caption = req.body.caption;
    m.hashtags = hashtags;
    await m.save();

    return res.status(200).send(true);
  } catch (e) {
    res.status(500).send({ error: "Something went wrong" });
  }
});

export async function deleteImage(id) {
  const image = await Media.findOne({
    _id: id,
    mediaType: IMAGE_MEDIA_TYPE_ID,
  });

  let s3Params = {
    Bucket: S3_BUCKET,
    Key: `${image.url.substring(
      image.url.indexOf("s3.amazonaws.com/") + "s3.amazonaws.com/".length
    )}`,
  };

  await Promise.all([
    s3.deleteObject(s3Params).promise(),
    Like.deleteMany({
      mediaId: image._id,
      mediaType: IMAGE_MEDIA_TYPE_ID,
    }),
    Dislike.deleteMany({
      mediaId: image._id,
      mediaType: IMAGE_MEDIA_TYPE_ID,
    }),
    Comment.deleteMany({
      mediaId: image._id,
      mediaType: IMAGE_MEDIA_TYPE_ID,
    }),
    CommentLike.deleteMany({
      mediaId: image._id,
      mediaType: IMAGE_MEDIA_TYPE_ID,
    }),
    CommentDislike.deleteMany({
      mediaId: image._id,
      mediaType: IMAGE_MEDIA_TYPE_ID,
    }),
    image.delete(),
  ]);
}

router.delete("/:id", async (req, res) => {
  try {
    await deleteImage(req.params.id);

    return res.status(200).send(true);
  } catch (e) {
    res.status(500).send({ error: "Something went wrong" });
  }
});

export default router;
