import dotenv from "dotenv";
dotenv.config();

const { Media, Like, Dislike, Comment } = require("../database");

const router = require("express").Router();
import { deleteReplies } from "../utils/helpers";
import { NOTE_MEDIA_TYPE_ID, IMAGE_SUBSCRIPTION_PREFIX } from "../constants";

router.put("/comments/:id", async (req, res) => {
  try {
    await Comment.updateOne({ _id: req.params.id }, { body: req.body.body });

    return res.status(200).send(true);
  } catch (e) {
    res.status(500).send({ error: "Something went wrong" });
  }
});

router.delete("/comments/:id", async (req, res) => {
  try {
    const iComment = await Comment.findOne({
      _id: req.params.id,
      mediaType: NOTE_MEDIA_TYPE_ID,
    });
    let note = await Media.findOne({
      _id: iComment.noteId,
      mediaType: NOTE_MEDIA_TYPE_ID,
    });
    let totalDecr = 1;
    if (iComment) {
      if (iComment.replyId) {
        const rComment = await Comment.findOne({
          _id: iComment.replyId,
          mediaType: NOTE_MEDIA_TYPE_ID,
        });
        rComment.replyCount--;
        await rComment.save();
      }

      totalDecr += await deleteReplies(Comment, iComment, note);

      await iComment.delete();
    }
    await note.update({ $inc: { commentCount: -totalDecr } });
    return res.status(200).send({
      createdAt: note.createdAt,
      commentCount: note.commentCount - totalDecr,
    });
  } catch (e) {
    res.status(500).send({ error: "Something went wrong" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const note = await Media.findOne({
      _id: req.params.id,
      mediaType: NOTE_MEDIA_TYPE_ID,
    });

    await Like.deleteMany({ noteId: note._id, mediaType: NOTE_MEDIA_TYPE_ID });
    await Dislike.deleteMany({
      noteId: note._id,
      mediaType: NOTE_MEDIA_TYPE_ID,
    });
    await Comment.deleteMany({
      noteId: note._id,
      mediaType: NOTE_MEDIA_TYPE_ID,
    });
    await note.delete();

    return res.status(200).send(true);
  } catch (e) {
    res.status(500).send({ error: "Something went wrong" });
  }
});

export default router;
