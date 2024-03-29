import "regenerator-runtime/runtime.js";
import dotenv from "dotenv";
dotenv.config();
import throng from "throng";
import taskQueue from "../queues/tasks";

// Email imports
import sgMail from "@sendgrid/mail";
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Delete user imports
import { deleteVideo, deleteVideoComment } from "../routes/video";
import { deleteImage, deleteImageComment } from "../routes/image";
import { deleteNote, deleteNoteComment } from "../routes/note";

import {
  VIDEO_MEDIA_TYPE_ID,
  IMAGE_MEDIA_TYPE_ID,
  NOTE_MEDIA_TYPE_ID,
} from "../constants";

const {
  Media,
  Comment,
  Notification,
  Like,
  Dislike,
  CommentLike,
  CommentDislike,
  View,
  User,
} = require("../database");

let maxJobsPerWorker = 4;

function start() {
  taskQueue.process(maxJobsPerWorker, async function (job, done) {
    let { type, params } = job.data;
    switch (type) {
      case "email": {
        sgMail
          .send(params)
          .then(() => done())
          .catch((e) => {
            console.log(`failed to send email to ${username}:`, e);
            done(new Error());
          });
      }
      case "delete": {
        try {
          let username = params.username;

          let vComments = await Comment.find({
            username,
            mediaType: VIDEO_MEDIA_TYPE_ID,
          })
            .select({ _id: 1 })
            .lean();
          vComments.forEach(async (vc) => await deleteVideoComment(vc._id));
          let iComments = await Comment.find({
            username,
            mediaType: IMAGE_MEDIA_TYPE_ID,
          })
            .select({ _id: 1 })
            .lean();
          iComments.forEach(async (ic) => await deleteImageComment(ic._id));
          let nComments = await Comment.find({
            username,
            mediaType: NOTE_MEDIA_TYPE_ID,
          })
            .select({ _id: 1 })
            .lean();
          nComments.forEach(async (nc) => await deleteNoteComment(nc._id));

          let videos = await Media.find({
            username,
            mediaType: VIDEO_MEDIA_TYPE_ID,
          })
            .select({ _id: 1 })
            .lean();
          videos.forEach(async (v) => await deleteVideo(v._id));
          let images = await Media.find({
            username,
            mediaType: IMAGE_MEDIA_TYPE_ID,
          })
            .select({ _id: 1 })
            .lean();
          images.forEach(async (i) => await deleteImage(i._id));
          let notes = await Media.find({
            username,
            mediaType: NOTE_MEDIA_TYPE_ID,
          })
            .select({ _id: 1 })
            .lean();
          notes.forEach(async (n) => await deleteNote(n._id));

          await Promise.all([
            User.deleteOne({ username }),
            View.deleteMany({ username }),
            Like.deleteMany({ username }),
            Dislike.deleteMany({ username }),
            CommentLike.deleteMany({ username }),
            CommentDislike.deleteMany({ username }),
            Notification.deleteMany({
              $or: [{ receiver: username }, { sender: username }],
            }),
          ]);

          done();
        } catch (e) {
          done(e);
        }
      }
    }
  });
}

throng({ workers: process.env.WEB_CONCURRENCY || 2, start });
