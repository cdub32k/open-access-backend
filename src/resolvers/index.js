import DB from "../database";
const stripe = require("stripe")(process.env.STRIPE_SK);

const perPage = 4;

import {
  VIDEO_MEDIA_TYPE_ID,
  IMAGE_MEDIA_TYPE_ID,
  NOTE_MEDIA_TYPE_ID,
  NOTIFICATION_SUBSCRIPTION_PREFIX,
  NEWSFEED_VIDEO_SUBSCRIPTION_PREFIX,
  NEWSFEED_IMAGE_SUBSCRIPTION_PREFIX,
  NEWSFEED_NOTE_SUBSCRIPTION_PREFIX,
  VIDEO_SUBSCRIPTION_PREFIX,
  IMAGE_SUBSCRIPTION_PREFIX,
  NOTE_SUBSCRIPTION_PREFIX,
} from "../constants";
import { parseHashtags, convertQueryToRegex } from "../utils/helpers";

const resolvers = {
  Query: {
    user: async (parent, { username }, { req }, info) => {
      if (!req.authorized) return null;

      if (!req.active && req.username != username) return null;

      const user = await DB.User.findOne({ username }).lean();

      if (
        user.active &&
        user.activeUntil &&
        new Date(user.activeUntil) < new Date()
      ) {
        user.active = false;
        await User.updateOne({ _id: user._id }, { active: false });
      }

      return user;
    },
    users: async (parent, args, { req: { authorized, active } }, info) => {
      if (!authorized || !active) return null;

      const users = await DB.User.find().lean();

      return users;
    },
    video: async (
      parent,
      { id, cId },
      { req: { username, authorized, active } },
      info
    ) => {
      if (!authorized || !active) return null;

      const video = await DB.Media.findOne({
        _id: id,
        mediaType: VIDEO_MEDIA_TYPE_ID,
      }).lean();

      if (cId) {
        let comm = await DB.Comment.findOne({
          _id: cId,
          mediaType: VIDEO_MEDIA_TYPE_ID,
        }).lean();
        comm.highlighted = true;
        while (comm.replyId) {
          let user = await DB.User.findOne({ username: comm.username }).lean();
          comm.user = {};
          comm.user.username = user.username;
          comm.user.profilePic = user.profilePic;
          let [liked, disliked] = await Promise.all([
            DB.CommentLike.exists({
              mediaType: VIDEO_MEDIA_TYPE_ID,
              username,
              commentId: comm._id,
            }),
            DB.CommentDislike.exists({
              mediaType: VIDEO_MEDIA_TYPE_ID,
              username,
              commentId: comm._id,
            }),
          ]);
          comm.liked = liked;
          comm.disliked = disliked;
          let c = await DB.Comment.findOne({
            _id: comm.replyId,
            mediaType: VIDEO_MEDIA_TYPE_ID,
          }).lean();
          c.replies = JSON.stringify([comm]);
          comm = c;
        }

        let comms = await DB.Comment.find({
          mediaId: id,
          mediaType: VIDEO_MEDIA_TYPE_ID,
          _id: { $ne: comm._id },
          replyId: null,
        })
          .sort({
            createdAt: -1,
          })
          .limit(perPage)
          .lean();
        video.comments = [comm, ...comms];
      }
      return video;
    },
    commentsSearch: async (
      parent,
      { username, page },
      { req: { authorized, active } },
      info
    ) => {
      if (!authorized || !active) return null;
      if (!page) page = 0;

      let comms = await DB.Comment.find({ username })
        .skip(page * perPage)
        .limit(perPage)
        .sort({
          createdAt: -1,
        })
        .lean();

      return { comments: comms };
    },
    likesSearch: async (
      parent,
      { username, page },
      { req: { authorized, active } },
      info
    ) => {
      if (!authorized || !active) return null;
      if (!page) page = 0;

      let likes = await DB.Like.find({ username })
        .skip(page * perPage)
        .limit(perPage)
        .sort({
          createdAt: -1,
        })
        .lean();

      return { likes };
    },
    dislikesSearch: async (
      parent,
      { username, page },
      { req: { authorized, active } },
      info
    ) => {
      if (!authorized || !active) return null;
      if (!page) page = 0;

      let dislikes = await DB.Dislike.find({ username })
        .skip(page * perPage)
        .limit(perPage)
        .sort({
          createdAt: -1,
        })
        .lean();

      return { dislikes };
    },
    videoSearch: async (
      parent,
      { username, query, hashtag, page, lastOldest },
      { req: { authorized, active } },
      info
    ) => {
      if (!authorized || !active) return null;

      const criteria = { mediaType: VIDEO_MEDIA_TYPE_ID };
      if (!page) page = 0;
      if (username) criteria.username = username;
      if (query || hashtag) criteria.$or = [];

      if (query)
        criteria.$or.push({
          title: convertQueryToRegex(query),
        });
      if (hashtag)
        criteria.$or.push({
          hashtags: { $in: hashtag.toLowerCase().split(",") },
        });
      if (lastOldest) criteria.uploadedAt = { $lt: lastOldest };

      const videoCount = await DB.Media.find(criteria)
        .limit(100)
        .countDocuments();
      const videos = await DB.Media.find(criteria)
        .sort({
          uploadedAt: -1,
        })
        .skip(page * perPage)
        .limit(perPage)
        .select({
          likeCount: 1,
          dislikeCount: 1,
          commentCount: 1,
          username: 1,
          url: 1,
          thumbUrl: 1,
          title: 1,
          caption: 1,
          viewCount: 1,
          uploadedAt: 1,
          _id: 1,
        })
        .lean();

      return {
        videos,
        videoCount,
        query,
        hashtag,
        hasMore: videoCount > page * perPage + perPage,
      };
    },
    imageSearch: async (
      parent,
      { username, query, hashtag, page, lastOldest },
      { req: { authorized, active } },
      info
    ) => {
      if (!authorized || !active) return null;

      const criteria = { mediaType: IMAGE_MEDIA_TYPE_ID };
      if (!page) page = 0;
      if (username) criteria.username = username;
      if (query || hashtag) criteria.$or = [];
      if (query)
        criteria.$or.push({
          title: convertQueryToRegex(query),
        });
      if (hashtag)
        criteria.$or.push({
          hashtags: { $in: hashtag.toLowerCase().split(",") },
        });
      if (lastOldest) criteria.uploadedAt = { $lt: lastOldest };

      const totalCount = await DB.Media.find(criteria).countDocuments();
      const images = await DB.Media.find(criteria)
        .sort({
          uploadedAt: -1,
        })
        .skip(page * perPage)
        .limit(perPage)
        .select({
          likeCount: 1,
          dislikeCount: 1,
          commentCount: 1,
          username: 1,
          url: 1,
          title: 1,
          caption: 1,
          uploadedAt: 1,
          _id: 1,
        })
        .lean();

      return {
        images,
        hasMore: totalCount > page * perPage + perPage,
      };
    },
    noteSearch: async (
      parent,
      { username, query, hashtag, page, lastOldest },
      { req: { authorized, active } },
      info
    ) => {
      if (!authorized || !active) return null;

      const criteria = { mediaType: NOTE_MEDIA_TYPE_ID };
      if (!page) page = 0;
      if (username) criteria.username = username;
      if (query || hashtag) criteria.$or = [];
      if (query)
        criteria.$or.push({
          caption: convertQueryToRegex(query),
        });
      if (hashtag)
        criteria.$or.push({
          hashtags: { $in: hashtag.toLowerCase().split(",") },
        });
      if (lastOldest) criteria.uploadedAt = { $lt: lastOldest };

      const totalCount = await DB.Media.find(criteria).countDocuments();
      const notes = await DB.Media.find(criteria)
        .sort({
          uploadedAt: -1,
        })
        .skip(page * perPage)
        .limit(perPage)
        .select({
          likeCount: 1,
          dislikeCount: 1,
          commentCount: 1,
          username: 1,
          caption: 1,
          uploadedAt: 1,
          _id: 1,
        })
        .lean();

      return {
        notes,
        hasMore: totalCount > page * perPage + perPage,
      };
    },

    image: async (
      parent,
      { id, cId },
      { req: { username, authorized, active } },
      info
    ) => {
      if (!authorized || !active) return null;

      const image = await DB.Media.findOne({
        _id: id,
        mediaType: IMAGE_MEDIA_TYPE_ID,
      });

      if (cId) {
        let comm = await DB.Comment.findOne({
          _id: cId,
          mediaType: IMAGE_MEDIA_TYPE_ID,
        }).lean();
        comm.highlighted = true;
        while (comm.replyId) {
          let user = await DB.User.findOne({
            username: comm.username,
          });
          comm.user = {};
          comm.user.username = user.username;
          comm.user.profilePic = user.profilePic;
          let [liked, disliked] = await Promise.all([
            DB.CommentLike.exists({
              mediaType: IMAGE_MEDIA_TYPE_ID,
              username,
              commentId: comm._id,
            }),
            DB.CommentDislike.exists({
              mediaType: IMAGE_MEDIA_TYPE_ID,
              username,
              commentId: comm._id,
            }),
          ]);
          comm.liked = liked;
          comm.disliked = disliked;
          let c = await DB.Comment.findOne({
            _id: comm.replyId,
            mediaType: IMAGE_MEDIA_TYPE_ID,
          }).lean();
          c.replies = JSON.stringify([comm]);
          comm = c;
        }

        let comms = await DB.Comment.find({
          mediaId: id,
          _id: { $ne: comm._id },
          replyId: null,
        })
          .sort({
            createdAt: -1,
          })
          .limit(perPage)
          .lean();
        image.comments = [comm, ...comms];
      }

      return image;
    },
    note: async (
      parent,
      { id, cId },
      { req: { username, authorized, active } },
      info
    ) => {
      if (!authorized || !active) return null;

      const note = await DB.Media.findOne({
        _id: id,
        mediaType: NOTE_MEDIA_TYPE_ID,
      }).lean();

      if (cId) {
        let comm = await DB.Comment.findOne({
          _id: cId,
          mediaType: NOTE_MEDIA_TYPE_ID,
        }).lean();
        comm.highlighted = true;
        while (comm.replyId) {
          let user = await DB.User.findOne({ username: comm.username }).lean();
          comm.user = {};
          comm.user.username = user.username;
          comm.user.profilePic = user.profilePic;
          let [liked, disliked] = await Promise.all([
            DB.CommentLike.exists({
              mediaType: NOTE_MEDIA_TYPE_ID,
              username,
              commentId: comm._id,
            }),
            DB.CommentDislike.exists({
              mediaType: NOTE_MEDIA_TYPE_ID,
              username,
              commentId: comm._id,
            }),
          ]);
          comm.liked = liked;
          comm.disliked = disliked;
          let c = await DB.Comment.findOne({
            _id: comm.replyId,
            mediaType: NOTE_MEDIA_TYPE_ID,
          }).lean();
          c.replies = JSON.stringify([comm]);
          comm = c;
        }

        let comms = await DB.Comment.find({
          mediaType: NOTE_MEDIA_TYPE_ID,
          mediaId: id,
          _id: { $ne: comm._id },
          replyId: null,
        })
          .sort({
            createdAt: -1,
          })
          .limit(perPage)
          .lean();
        note.comments = [comm, ...comms];
      }
      return note;
    },

    newsfeedVideos: async (
      parent,
      { lastOldest },
      { req: { username, authorized, active } },
      info
    ) => {
      if (!authorized || !active) return null;

      const criteria = { mediaType: VIDEO_MEDIA_TYPE_ID };
      if (lastOldest) criteria.uploadedAt = { $lt: lastOldest };

      const videos = await DB.Media.find(criteria)
        .sort({
          uploadedAt: -1,
        })
        .limit(perPage)
        .lean();

      return videos;
    },
    newsfeedImages: async (
      parent,
      { lastOldest },
      { req: { username, authorized, active } },
      info
    ) => {
      if (!authorized || !active) return null;

      const criteria = { mediaType: IMAGE_MEDIA_TYPE_ID };
      if (lastOldest) criteria.uploadedAt = { $lt: lastOldest };

      const images = await DB.Media.find(criteria)
        .sort({
          uploadedAt: -1,
        })
        .limit(perPage)
        .lean();

      return images;
    },
    newsfeedNotes: async (
      parent,
      { lastOldest },
      { req: { username, authorized, active } },
      info
    ) => {
      if (!authorized || !active) return null;

      const criteria = { mediaType: NOTE_MEDIA_TYPE_ID };
      if (lastOldest) criteria.uploadedAt = { $lt: lastOldest };

      const notes = await DB.Media.find(criteria)
        .sort({
          uploadedAt: -1,
        })
        .limit(perPage)
        .lean();

      return notes;
    },

    videoCommentReplies: async (parent, { commentId }) => {
      const replies = await DB.Comment.find({
        mediaType: VIDEO_MEDIA_TYPE_ID,
        replyId: commentId,
      })
        .sort({
          createdAt: -1,
        })
        .lean();
      return replies;
    },
    imageCommentReplies: async (parent, { commentId }) => {
      const replies = await DB.Comment.find({
        mediaType: IMAGE_MEDIA_TYPE_ID,
        replyId: commentId,
      })
        .sort({
          createdAt: -1,
        })
        .lean();
      return replies;
    },
    noteCommentReplies: async (parent, { commentId }) => {
      const replies = await DB.Comment.find({
        mediaType: NOTE_MEDIA_TYPE_ID,
        replyId: commentId,
      })
        .sort({
          createdAt: -1,
        })
        .lean();
      return replies;
    },
  },
  VideoSearchResponse: {
    imageCount: async ({ query, hashtag }) => {
      const criteria = { mediaType: IMAGE_MEDIA_TYPE_ID };
      if (query || hashtag) criteria.$or = [];
      else return 0;

      if (query)
        criteria.$or.push({
          title: convertQueryToRegex(query),
        });
      if (hashtag)
        criteria.$or.push({
          hashtags: { $in: hashtag.toLowerCase().split(",") },
        });

      return await DB.Media.find(criteria).limit(100).countDocuments();
    },
    noteCount: async ({ query, hashtag }) => {
      const criteria = { mediaType: NOTE_MEDIA_TYPE_ID };
      if (query || hashtag) criteria.$or = [];
      else return 0;

      if (query)
        criteria.$or.push({
          caption: convertQueryToRegex(query),
        });
      if (hashtag)
        criteria.$or.push({
          hashtags: { $in: hashtag.toLowerCase().split(",") },
        });

      return await DB.Media.find(criteria).limit(100).countDocuments();
    },
  },
  AnyComment: {
    __resolveType(obj, context, info) {
      if (obj.mediaType == "video") return "VideoComment";
      if (obj.mediaType == "image") return "ImageComment";
      if (obj.mediaType == "note") return "NoteComment";
    },
  },
  AnyLike: {
    __resolveType(obj, context, info) {
      if (obj.mediaType == "video") return "VideoLike";
      if (obj.mediaType == "image") return "ImageLike";
      if (obj.mediaType == "note") return "NoteLike";
    },
  },
  AnyDislike: {
    __resolveType(obj, context, info) {
      if (obj.mediaType == "video") return "VideoDislike";
      if (obj.mediaType == "image") return "ImageDislike";
      if (obj.mediaType == "note") return "NoteDislike";
    },
  },

  VideoLike: {
    video: async ({ mediaId }) => {
      return await DB.Media.findOne({
        _id: mediaId,
        mediaType: VIDEO_MEDIA_TYPE_ID,
      }).lean();
    },
  },

  ImageLike: {
    image: async ({ mediaId }) => {
      return await DB.Media.findOne({
        _id: mediaId,
        mediaType: IMAGE_MEDIA_TYPE_ID,
      }).lean();
    },
  },

  NoteLike: {
    note: async ({ mediaId }) => {
      return await DB.Media.findOne({
        _id: mediaId,
        mediaType: NOTE_MEDIA_TYPE_ID,
      }).lean();
    },
  },

  VideoDislike: {
    video: async ({ mediaId }) => {
      return await DB.Media.findOne({
        _id: mediaId,
        mediaType: VIDEO_MEDIA_TYPE_ID,
      }).lean();
    },
  },

  ImageDislike: {
    image: async ({ mediaId }) => {
      return await DB.Media.findOne({
        _id: mediaId,
        mediaType: IMAGE_MEDIA_TYPE_ID,
      }).lean();
    },
  },

  NoteDislike: {
    note: async ({ mediaId }) => {
      return await DB.Media.findOne({
        _id: mediaId,
        mediaType: NOTE_MEDIA_TYPE_ID,
      }).lean();
    },
  },

  Mutation: {
    postNote: async (
      parent,
      { caption },
      { req: { username, authorized, active }, pubsub },
      info
    ) => {
      if (!authorized || !active) return null;

      let hashtags = parseHashtags(caption);

      const note = await DB.Media.create({
        mediaType: NOTE_MEDIA_TYPE_ID,
        caption,
        username,
        hashtags,
      });

      let profilePic = await DB.User.findOne({ username }).lean().profilePic;

      note.user = { username, profilePic };
      pubsub.publish(NEWSFEED_NOTE_SUBSCRIPTION_PREFIX, {
        newsfeedNotes: note,
      });

      return note;
    },

    likeNote: async (
      parent,
      { id },
      { req: { username, authorized, active }, pubsub },
      info
    ) => {
      if (!authorized || !active) return null;

      try {
        const liked = await DB.Like.exists({
          username,
          mediaId: id,
          mediaType: NOTE_MEDIA_TYPE_ID,
        });
        const note = await DB.Media.findOne({
          _id: id,
          mediaType: NOTE_MEDIA_TYPE_ID,
        });
        if (!liked) {
          await DB.Like.create({
            mediaType: NOTE_MEDIA_TYPE_ID,
            username,
            mediaId: id,
          });
          note.likeCount++;
          await note.save();

          const notified = await DB.Notification.exists({
            sender: username,
            targetId: note._id,
            type: "like",
          });
          if (!notified)
            DB.Notification.create({
              sender: username,
              receiver: note.username,
              type: "like",
              target: "note",
              targetId: note._id,
            });
        } else {
          await DB.Like.deleteOne({
            username,
            mediaId: id,
            mediaType: NOTE_MEDIA_TYPE_ID,
          });
          note.likeCount--;
          await note.save();
        }

        pubsub.publish(NEWSFEED_NOTE_SUBSCRIPTION_PREFIX + note._id, {
          newsfeedNoteItem: {
            _id: note._id,
            likeCount: note.likeCount,
            comments: [],
          },
        });
        pubsub.publish(NOTE_SUBSCRIPTION_PREFIX + note._id, {
          noteItem: {
            _id: note._id,
            likeCount: note.likeCount,
            comments: [],
          },
        });

        return true;
      } catch (error) {
        return false;
      }
    },
    dislikeNote: async (
      parent,
      { id },
      { req: { username, authorized, active }, pubsub },
      info
    ) => {
      if (!authorized || !active) return null;

      try {
        const disliked = await DB.Dislike.exists({
          mediaType: NOTE_MEDIA_TYPE_ID,
          username,
          mediaId: id,
        });
        const note = await DB.Media.findOne({
          _id: id,
          mediaType: NOTE_MEDIA_TYPE_ID,
        });

        if (!disliked) {
          await DB.Dislike.create({
            mediaType: NOTE_MEDIA_TYPE_ID,
            username,
            mediaId: id,
          });
          note.dislikeCount++;
          await note.save();

          const notified = await DB.Notification.exists({
            sender: username,
            targetId: note._id,
            type: "dislike",
          });
          if (!notified)
            DB.Notification.create({
              sender: username,
              receiver: note.username,
              type: "dislike",
              target: "note",
              targetId: note._id,
            });
        } else {
          await DB.Dislike.deleteOne({
            username,
            mediaId: id,
            mediaType: NOTE_MEDIA_TYPE_ID,
          });
          note.dislikeCount--;
          await note.save();
        }

        pubsub.publish(NEWSFEED_NOTE_SUBSCRIPTION_PREFIX + note._id, {
          newsfeedNoteItem: {
            _id: note.id,
            dislikeCount: note.dislikeCount,
            comments: [],
          },
        });
        pubsub.publish(NOTE_SUBSCRIPTION_PREFIX + note._id, {
          noteItem: {
            _id: note.id,
            dislikeCount: note.dislikeCount,
            comments: [],
          },
        });

        return true;
      } catch (error) {
        return false;
      }
    },
    commentNote: async (
      parent,
      { id, body, replyId },
      { req: { username, authorized, active }, pubsub },
      info
    ) => {
      if (!authorized || !active) return null;

      try {
        const comment = await DB.Comment.create({
          mediaType: NOTE_MEDIA_TYPE_ID,
          username,
          mediaId: id,
          body,
          replyId,
        });

        const note = await DB.Media.findOne({
          _id: id,
          mediaType: NOTE_MEDIA_TYPE_ID,
        });
        note.commentCount++;
        await note.save();

        if (!replyId)
          DB.Notification.create({
            sender: username,
            receiver: note.username,
            type: "comment",
            target: "note",
            targetId: note._id,
            commentId: comment._id,
            body,
          });

        if (replyId) {
          const comm = await DB.Comment.findOne({
            _id: replyId,
            mediaType: NOTE_MEDIA_TYPE_ID,
          });
          comm.replyCount++;
          await comm.save();
          DB.Notification.create({
            sender: username,
            receiver: comm.username,
            type: "reply",
            target: "note",
            targetId: note._id,
            commentId: comment._id,
            body,
          });
        }

        pubsub.publish(NEWSFEED_NOTE_SUBSCRIPTION_PREFIX + note._id, {
          newsfeedNoteItem: {
            _id: note._id,
            commentCount: note.commentCount,
            comments: [],
          },
        });
        pubsub.publish(NOTE_SUBSCRIPTION_PREFIX + note._id, {
          noteItem: {
            _id: note._id,
            commentCount: note.commentCount,
            comments: [comment],
          },
        });

        return comment._id;
      } catch (error) {
        return null;
      }
    },
    likeImage: async (
      parent,
      { id },
      { req: { username, authorized, active }, pubsub },
      info
    ) => {
      if (!authorized || !active) return null;

      try {
        const liked = await DB.Like.exists({
          username,
          mediaId: id,
          mediaType: IMAGE_MEDIA_TYPE_ID,
        });
        const image = await DB.Media.findOne({
          _id: id,
          mediaType: IMAGE_MEDIA_TYPE_ID,
        });
        if (!liked) {
          await DB.Like.create({
            mediaType: IMAGE_MEDIA_TYPE_ID,
            username,
            mediaId: id,
          });
          image.likeCount++;
          await image.save();

          const notified = await DB.Notification.exists({
            sender: username,
            targetId: image._id,
            type: "like",
          });
          if (!notified)
            DB.Notification.create({
              sender: username,
              receiver: image.username,
              type: "like",
              target: "image",
              targetId: image._id,
            });
        } else {
          await DB.Like.deleteOne({
            username,
            mediaId: id,
            mediaType: IMAGE_MEDIA_TYPE_ID,
          });
          image.likeCount--;
          await image.save();
        }

        pubsub.publish(NEWSFEED_IMAGE_SUBSCRIPTION_PREFIX + image._id, {
          newsfeedImageItem: {
            _id: image._id,
            likeCount: image.likeCount,
            comments: [],
          },
        });
        pubsub.publish(IMAGE_SUBSCRIPTION_PREFIX + image._id, {
          imageItem: {
            _id: image._id,
            likeCount: image.likeCount,
            comments: [],
          },
        });

        return true;
      } catch (error) {
        return false;
      }
    },
    dislikeImage: async (
      parent,
      { id },
      { req: { username, authorized, active }, pubsub },
      info
    ) => {
      if (!authorized || !active) return null;

      try {
        const disliked = await DB.Dislike.exists({
          mediaType: IMAGE_MEDIA_TYPE_ID,
          username,
          mediaId: id,
        });
        const image = await DB.Media.findOne({
          _id: id,
          mediaType: IMAGE_MEDIA_TYPE_ID,
        });

        if (!disliked) {
          await DB.Dislike.create({
            mediaType: IMAGE_MEDIA_TYPE_ID,
            username,
            mediaId: id,
          });
          image.dislikeCount++;
          await image.save();

          const notified = await DB.Notification.exists({
            sender: username,
            targetId: image._id,
            type: "dislike",
          });
          if (!notified)
            DB.Notification.create({
              sender: username,
              receiver: image.username,
              type: "dislike",
              target: "image",
              targetId: image._id,
            });
        } else {
          await DB.Dislike.deleteOne({
            username,
            mediaId: id,
            mediaType: IMAGE_MEDIA_TYPE_ID,
          });
          image.dislikeCount--;
          await image.save();
        }

        pubsub.publish(NEWSFEED_IMAGE_SUBSCRIPTION_PREFIX + image._id, {
          newsfeedImageItem: {
            _id: image._id,
            dislikeCount: image.dislikeCount,
            comments: [],
          },
        });
        pubsub.publish(IMAGE_SUBSCRIPTION_PREFIX + image._id, {
          imageItem: {
            _id: image._id,
            dislikeCount: image.dislikeCount,
            comments: [],
          },
        });

        return true;
      } catch (error) {
        return false;
      }
    },
    commentImage: async (
      parent,
      { id, body, replyId },
      { req: { username, authorized, active }, pubsub },
      info
    ) => {
      if (!authorized || !active) return null;

      try {
        const comment = await DB.Comment.create({
          mediaType: IMAGE_MEDIA_TYPE_ID,
          username,
          mediaId: id,
          body,
          replyId,
        });

        const image = await DB.Media.findOne({
          _id: id,
          mediaType: IMAGE_MEDIA_TYPE_ID,
        });
        image.commentCount++;
        await image.save();

        if (!replyId)
          DB.Notification.create({
            sender: username,
            receiver: image.username,
            type: "comment",
            target: "image",
            targetId: image._id,
            commentId: comment._id,
            body,
          });

        if (replyId) {
          const comm = await DB.Comment.findOne({
            _id: replyId,
            mediaType: IMAGE_MEDIA_TYPE_ID,
          });
          comm.replyCount++;
          await comm.save();
          DB.Notification.create({
            sender: username,
            receiver: comm.username,
            type: "reply",
            target: "image",
            targetId: image._id,
            commentId: comment._id,
            body,
          });
        }

        pubsub.publish(NEWSFEED_IMAGE_SUBSCRIPTION_PREFIX + image._id, {
          newsfeedImageItem: {
            _id: image._id,
            commentCount: image.commentCount,
            comments: [],
          },
        });
        pubsub.publish(IMAGE_SUBSCRIPTION_PREFIX + image._id, {
          imageItem: {
            _id: image._id,
            commentCount: image.commentCount,
            comments: [comment],
          },
        });

        return comment._id;
      } catch (error) {
        return null;
      }
    },
    likeVideo: async (
      parent,
      { id },
      { req: { username, authorized, active }, pubsub },
      info
    ) => {
      if (!authorized || !active) return null;

      try {
        const liked = await DB.Like.exists({
          username,
          mediaId: id,
          mediaType: VIDEO_MEDIA_TYPE_ID,
        });
        const video = await DB.Media.findOne({
          _id: id,
          mediaType: VIDEO_MEDIA_TYPE_ID,
        });
        if (!liked) {
          await DB.Like.create({
            mediaType: VIDEO_MEDIA_TYPE_ID,
            username,
            mediaId: id,
          });
          video.likeCount++;
          await video.save();

          const notified = await DB.Notification.exists({
            sender: username,
            targetId: video._id,
            type: "like",
          });
          if (!notified)
            DB.Notification.create({
              sender: username,
              receiver: video.username,
              type: "like",
              target: "video",
              targetId: video._id,
            });
        } else {
          await DB.Like.deleteOne({
            username,
            mediaId: id,
            mediaType: VIDEO_MEDIA_TYPE_ID,
          });
          video.likeCount--;
          await video.save();
        }

        pubsub.publish(NEWSFEED_VIDEO_SUBSCRIPTION_PREFIX + video._id, {
          newsfeedVideoItem: {
            _id: video._id,
            likeCount: video.likeCount,
            comments: [],
          },
        });
        pubsub.publish(VIDEO_SUBSCRIPTION_PREFIX + video._id, {
          videoItem: {
            _id: video._id,
            likeCount: video.likeCount,
            comments: [],
          },
        });

        return true;
      } catch (error) {
        return false;
      }
    },
    dislikeVideo: async (
      parent,
      { id },
      { req: { username, authorized, active }, pubsub },
      info
    ) => {
      if (!authorized || !active) return null;

      try {
        const disliked = await DB.Dislike.exists({
          mediaType: VIDEO_MEDIA_TYPE_ID,
          username,
          mediaId: id,
        });
        const video = await DB.Media.findOne({
          _id: id,
          mediaType: VIDEO_MEDIA_TYPE_ID,
        });

        if (!disliked) {
          await DB.Dislike.create({
            mediaType: VIDEO_MEDIA_TYPE_ID,
            username,
            mediaId: id,
          });
          video.dislikeCount++;
          await video.save();

          const notified = await DB.Notification.exists({
            sender: username,
            targetId: video._id,
            type: "dislike",
          });
          if (!notified)
            DB.Notification.create({
              sender: username,
              receiver: video.username,
              type: "dislike",
              target: "video",
              targetId: video._id,
            });
        } else {
          await DB.Dislike.deleteOne({
            username,
            mediaId: id,
            mediaType: VIDEO_MEDIA_TYPE_ID,
          });
          video.dislikeCount--;
          await video.save();
        }

        pubsub.publish(NEWSFEED_VIDEO_SUBSCRIPTION_PREFIX + video._id, {
          newsfeedVideoItem: {
            _id: video._id,
            dislikeCount: video.dislikeCount,
            comments: [],
          },
        });
        pubsub.publish(VIDEO_SUBSCRIPTION_PREFIX + video._id, {
          videoItem: {
            _id: video._id,
            dislikeCount: video.dislikeCount,
            comments: [],
          },
        });

        return true;
      } catch (error) {
        return false;
      }
    },
    viewVideo: async (
      parent,
      { id },
      { req: { username, authorized, active }, pubsub },
      info
    ) => {
      if (!authorized || !active) return null;

      try {
        const viewed = await DB.View.exists({
          username,
          mediaId: id,
          mediaType: VIDEO_MEDIA_TYPE_ID,
        });

        if (viewed) return true;

        await DB.View.create({
          mediaType: VIDEO_MEDIA_TYPE_ID,
          username,
          mediaId: id,
        });

        const video = await DB.Media.findOne({
          _id: id,
          mediaType: VIDEO_MEDIA_TYPE_ID,
        });
        video.viewCount = video.viewCount + 1;
        await video.save();

        pubsub.publish(VIDEO_SUBSCRIPTION_PREFIX + video._id, {
          videoItem: {
            _id: video._id,
            viewCount: video.viewCount,
            comments: [],
          },
        });

        return true;
      } catch (error) {
        return false;
      }
    },
    commentVideo: async (
      parent,
      { id, body, replyId },
      { req: { username, authorized, active }, pubsub },
      info
    ) => {
      if (!authorized || !active) return null;

      try {
        const comment = await DB.Comment.create({
          mediaType: VIDEO_MEDIA_TYPE_ID,
          username,
          mediaId: id,
          body,
          replyId,
        });

        const video = await DB.Media.findOne({
          _id: id,
          mediaType: VIDEO_MEDIA_TYPE_ID,
        });
        video.commentCount++;
        await video.save();

        if (!replyId)
          DB.Notification.create({
            sender: username,
            receiver: video.username,
            type: "comment",
            target: "video",
            targetId: video._id,
            commentId: comment._id,
            body,
          });

        if (replyId) {
          const comm = await DB.Comment.findOne({
            _id: replyId,
            mediaType: VIDEO_MEDIA_TYPE_ID,
          });
          comm.replyCount++;
          await comm.save();
          DB.Notification.create({
            sender: username,
            receiver: comm.username,
            type: "reply",
            target: "video",
            targetId: video._id,
            commentId: comment._id,
            body,
          });
        }

        pubsub.publish(NEWSFEED_VIDEO_SUBSCRIPTION_PREFIX + video._id, {
          newsfeedVideoItem: {
            _id: video._id,
            commentCount: video.commentCount,
            comments: [],
          },
        });
        pubsub.publish(VIDEO_SUBSCRIPTION_PREFIX + video._id, {
          videoItem: {
            _id: video._id,
            commentCount: video.commentCount,
            comments: [comment],
          },
        });

        return comment._id;
      } catch (error) {
        return error;
      }
    },
    likeVideoComment: async (
      parent,
      { videoId, commentId },
      { req: { username, authorized, active }, pubsub },
      info
    ) => {
      if (!authorized || !active) return null;

      try {
        const liked = await DB.CommentLike.exists({
          mediaType: VIDEO_MEDIA_TYPE_ID,
          username,
          commentId,
        });
        const videoComment = await DB.Comment.findOne({
          _id: commentId,
          mediaType: VIDEO_MEDIA_TYPE_ID,
        });
        if (!liked) {
          await DB.CommentLike.create({
            mediaType: VIDEO_MEDIA_TYPE_ID,
            username,
            mediaId: videoId,
            commentId,
          });
          videoComment.likeCount++;
          await videoComment.save();
        } else {
          await DB.CommentLike.deleteOne({
            username,
            commentId,
            mediaType: VIDEO_MEDIA_TYPE_ID,
          });
          videoComment.likeCount--;
          await videoComment.save();
        }

        pubsub.publish(VIDEO_SUBSCRIPTION_PREFIX + videoId, {
          videoItem: {
            _id: videoId,
            comments: [{ _id: commentId, likeCount: videoComment.likeCount }],
          },
        });

        return true;
      } catch (error) {
        return false;
      }
    },
    dislikeVideoComment: async (
      parent,
      { videoId, commentId },
      { req: { username, authorized, active }, pubsub },
      info
    ) => {
      if (!authorized || !active) return null;

      try {
        const disliked = await DB.CommentDislike.exists({
          mediaType: VIDEO_MEDIA_TYPE_ID,
          username,
          commentId,
        });
        const videoComment = await DB.Comment.findOne({
          _id: commentId,
          mediaType: VIDEO_MEDIA_TYPE_ID,
        });
        if (!disliked) {
          await DB.CommentDislike.create({
            mediaType: VIDEO_MEDIA_TYPE_ID,
            username,
            mediaId: videoId,
            commentId,
          });
          videoComment.dislikeCount++;
          await videoComment.save();
        } else {
          await DB.CommentDislike.deleteOne({
            username,
            commentId,
            mediaType: VIDEO_MEDIA_TYPE_ID,
          });
          videoComment.dislikeCount--;
          await videoComment.save();
        }

        pubsub.publish(VIDEO_SUBSCRIPTION_PREFIX + videoId, {
          videoItem: {
            _id: videoId,
            comments: [
              { _id: commentId, dislikeCount: videoComment.dislikeCount },
            ],
          },
        });

        return true;
      } catch (error) {
        return false;
      }
    },
    likeNoteComment: async (
      parent,
      { noteId, commentId },
      { req: { username, authorized, active }, pubsub },
      info
    ) => {
      if (!authorized || !active) return null;

      try {
        const liked = await DB.CommentLike.exists({
          username,
          commentId,
        });
        const noteComment = await DB.Comment.findOne({
          _id: commentId,
          mediaType: NOTE_MEDIA_TYPE_ID,
        });
        if (!liked) {
          await DB.CommentLike.create({
            mediaType: NOTE_MEDIA_TYPE_ID,
            username,
            mediaId: noteId,
            commentId,
          });
          noteComment.likeCount++;
          await noteComment.save();
        } else {
          await DB.CommentLike.deleteOne({ username, commentId });
          noteComment.likeCount--;
          await noteComment.save();
        }

        pubsub.publish(NOTE_SUBSCRIPTION_PREFIX + noteId, {
          noteItem: {
            _id: noteId,
            comments: [{ _id: commentId, likeCount: noteComment.likeCount }],
          },
        });

        return true;
      } catch (error) {
        return false;
      }
    },
    dislikeNoteComment: async (
      parent,
      { noteId, commentId },
      { req: { username, authorized, active }, pubsub },
      info
    ) => {
      if (!authorized || !active) return null;

      try {
        const disliked = await DB.CommentDislike.exists({
          mediaType: NOTE_MEDIA_TYPE_ID,
          username,
          commentId,
        });
        const noteComment = await DB.Comment.findOne({
          _id: commentId,
          mediaType: NOTE_MEDIA_TYPE_ID,
        });
        if (!disliked) {
          await DB.CommentDislike.create({
            username,
            mediaId: noteId,
            mediaType: NOTE_MEDIA_TYPE_ID,
            commentId,
          });
          noteComment.dislikeCount++;
          await noteComment.save();
        } else {
          await DB.CommentDislike.deleteOne({
            username,
            commentId,
            mediaType: NOTE_MEDIA_TYPE_ID,
          });
          noteComment.dislikeCount--;
          await noteComment.save();
        }

        pubsub.publish(NOTE_SUBSCRIPTION_PREFIX + noteId, {
          noteItem: {
            _id: noteId,
            comments: [
              { _id: commentId, dislikeCount: noteComment.dislikeCount },
            ],
          },
        });

        return true;
      } catch (error) {
        return false;
      }
    },
    likeImageComment: async (
      parent,
      { imageId, commentId },
      { req: { username, authorized, active }, pubsub },
      info
    ) => {
      if (!authorized || !active) return null;

      try {
        const liked = await DB.CommentLike.exists({
          mediaType: IMAGE_MEDIA_TYPE_ID,
          username,
          commentId,
        });
        const imageComment = await DB.Comment.findOne({
          _id: commentId,
          mediaType: IMAGE_MEDIA_TYPE_ID,
        });
        if (!liked) {
          await DB.CommentLike.create({
            mediaType: IMAGE_MEDIA_TYPE_ID,
            username,
            mediaId: imageId,
            commentId,
          });
          imageComment.likeCount++;
          await imageComment.save();
        } else {
          await DB.CommentLike.deleteOne({
            username,
            commentId,
            mediaType: IMAGE_MEDIA_TYPE_ID,
          });
          imageComment.likeCount--;
          await imageComment.save();
        }

        pubsub.publish(IMAGE_SUBSCRIPTION_PREFIX + imageId, {
          imageItem: {
            _id: imageId,
            comments: [{ _id: commentId, likeCount: imageComment.likeCount }],
          },
        });

        return true;
      } catch (error) {
        return false;
      }
    },
    dislikeImageComment: async (
      parent,
      { imageId, commentId },
      { req: { username, authorized, active }, pubsub },
      info
    ) => {
      if (!authorized || !active) return null;

      try {
        const disliked = await DB.CommentDislike.exists({
          mediaType: IMAGE_MEDIA_TYPE_ID,
          username,
          commentId,
        });
        const imageComment = await DB.Comment.findOne({
          _id: commentId,
          mediaType: IMAGE_MEDIA_TYPE_ID,
        });
        if (!disliked) {
          await DB.CommentDislike.create({
            mediaType: IMAGE_MEDIA_TYPE_ID,
            username,
            mediaId: imageId,
            commentId,
          });
          imageComment.dislikeCount++;
          await imageComment.save();
        } else {
          await DB.CommentDislike.deleteOne({
            username,
            commentId,
            mediaType: IMAGE_MEDIA_TYPE_ID,
          });
          imageComment.dislikeCount--;
          await imageComment.save();
        }

        pubsub.publish(IMAGE_SUBSCRIPTION_PREFIX + imageId, {
          imageItem: {
            _id: imageId,
            comments: [
              { _id: commentId, dislikeCount: imageComment.dislikeCount },
            ],
          },
        });

        return true;
      } catch (error) {
        return false;
      }
    },
    markNotificationsRead: async (
      parent,
      { ids },
      { req: { username, authorized } },
      info
    ) => {
      if (!authorized) return null;

      try {
        await DB.Notification.updateMany(
          { _id: { $in: ids } },
          { read: true, readAt: Date.now() }
        );
        return true;
      } catch (e) {
        return false;
      }
    },
  },

  Note: {
    user: async ({ username }, args, context, info) => {
      if (!username) return null;
      let user = await DB.User.findOne({ username }).lean();
      user.profilePic = user.smallPic;
      return user;
    },
    liked: async ({ _id }, args, { req: { username } }, info) => {
      return await DB.Like.exists({
        username,
        mediaId: _id,
        mediaType: NOTE_MEDIA_TYPE_ID,
      });
    },
    disliked: async ({ _id }, args, { req: { username } }, info) => {
      return await DB.Dislike.exists({
        username,
        mediaId: _id,
        mediaType: NOTE_MEDIA_TYPE_ID,
      });
    },
    likes: async ({ _id }, args, context, info) => {
      return await DB.Like.exists({
        mediaId: _id,
        mediaType: NOTE_MEDIA_TYPE_ID,
      }).lean();
    },
    dislikes: async ({ _id }, args, context, info) => {
      return await DB.Dislike.find({
        mediaId: _id,
        mediaType: NOTE_MEDIA_TYPE_ID,
      }).lean();
    },
    comments: async ({ _id, comments }, { lastOldest }, context, info) => {
      if (comments) return comments;

      const criteria = { mediaType: NOTE_MEDIA_TYPE_ID, replyId: null };
      if (lastOldest) criteria.createdAt = { $lt: lastOldest };

      const c = await DB.Comment.find({ mediaId: _id, ...criteria })
        .sort({
          createdAt: -1,
        })
        .limit(perPage)
        .lean();
      return c;
    },
  },

  NoteComment: {
    user: async ({ username }, args, context) => {
      if (!username) return null;
      let user = await DB.User.findOne({ username }).lean();
      user.profilePic = user.smallPic;
      return user;
    },
    liked: async ({ _id }, args, { req: { username } }, info) => {
      return await DB.CommentLike.exists({
        mediaType: NOTE_MEDIA_TYPE_ID,
        username,
        commentId: _id,
      });
    },
    disliked: async ({ _id }, args, { req: { username } }, info) => {
      return await DB.CommentDislike.exists({
        mediaType: NOTE_MEDIA_TYPE_ID,
        username,
        commentId: _id,
      });
    },
    note: async ({ mediaId }, args, context) => {
      return await DB.Media.findOne({
        _id: mediaId,
        mediaType: NOTE_MEDIA_TYPE_ID,
      }).lean();
    },
  },

  Image: {
    user: async ({ username }, args, context, info) => {
      if (!username) return null;
      let user = await DB.User.findOne({ username }).lean();
      user.profilePic = user.smallPic;
      return user;
    },
    liked: async ({ _id }, args, { req: { username } }, info) => {
      return await DB.Like.exists({
        username,
        mediaId: _id,
        mediaType: IMAGE_MEDIA_TYPE_ID,
      });
    },
    disliked: async ({ _id }, args, { req: { username } }, info) => {
      return await DB.Dislike.exists({
        mediaType: IMAGE_MEDIA_TYPE_ID,
        username,
        mediaId: _id,
      });
    },
    likes: async ({ _id }, args, context, info) => {
      return await DB.Like.find({
        mediaId: _id,
        mediaType: IMAGE_MEDIA_TYPE_ID,
      }).lean();
    },
    dislikes: async ({ _id }, args, context, info) => {
      return await DB.Dislike.find({
        mediaId: _id,
        mediaType: IMAGE_MEDIA_TYPE_ID,
      }).lean();
    },
    comments: async ({ _id, comments }, { lastOldest }, context, info) => {
      if (comments) return comments;

      const criteria = { mediaType: IMAGE_MEDIA_TYPE_ID, replyId: null };
      if (lastOldest) criteria.createdAt = { $lt: lastOldest };

      const c = await DB.Comment.find({ mediaId: _id, ...criteria })
        .sort({
          createdAt: -1,
        })
        .limit(perPage)
        .lean();
      return c;
    },

    thumbUrl: async ({ url }, args, context, info) => {
      return url;
    },
  },

  ImageComment: {
    user: async ({ username }, args, context) => {
      if (!username) return null;
      let user = await DB.User.findOne({ username }).lean();
      user.profilePic = user.smallPic;
      return user;
    },
    liked: async ({ _id }, args, { req: { username } }, info) => {
      return await DB.CommentLike.exists({
        mediaType: IMAGE_MEDIA_TYPE_ID,
        username,
        commentId: _id,
      });
    },
    disliked: async ({ _id }, args, { req: { username } }, info) => {
      return await DB.CommentDislike.exists({
        mediaType: IMAGE_MEDIA_TYPE_ID,
        username,
        commentId: _id,
      });
    },
    image: async ({ mediaId }, args, context) => {
      return await DB.Media.findOne({
        _id: mediaId,
        mediaType: IMAGE_MEDIA_TYPE_ID,
      }).lean();
    },
  },

  Video: {
    user: async ({ username }, args, context, info) => {
      if (!username) return null;
      let user = await DB.User.findOne({ username }).lean();
      user.profilePic = user.smallPic;
      return user;
    },
    liked: async ({ _id }, args, { req: { username } }, info) => {
      return await DB.Like.exists({
        username,
        mediaId: _id,
        mediaType: VIDEO_MEDIA_TYPE_ID,
      });
    },
    disliked: async ({ _id }, args, { req: { username } }, info) => {
      return await DB.Dislike.exists({
        mediaType: VIDEO_MEDIA_TYPE_ID,
        username,
        mediaId: _id,
      });
    },
    likes: async ({ _id }, args, context, info) => {
      return await DB.Like.find({
        mediaId: _id,
        mediaType: VIDEO_MEDIA_TYPE_ID,
      }).lean();
    },
    dislikes: async ({ _id }, args, context, info) => {
      return await DB.Dislike.find({
        mediaId: _id,
        mediaType: VIDEO_MEDIA_TYPE_ID,
      }).lean();
    },
    views: async ({ _id }, args, context, info) => {
      return await DB.View.find({
        mediaId: _id,
        mediaType: VIDEO_MEDIA_TYPE_ID,
      }).lean();
    },
    comments: async ({ _id, comments }, { lastOldest }, context, info) => {
      if (comments) return comments;

      const criteria = { mediaType: VIDEO_MEDIA_TYPE_ID, replyId: null };
      if (lastOldest) criteria.createdAt = { $lt: lastOldest };

      const c = await DB.Comment.find({ mediaId: _id, ...criteria })
        .sort({
          createdAt: -1,
        })
        .limit(perPage)
        .lean();
      return c;
    },
  },

  VideoComment: {
    user: async ({ username }, args, context) => {
      if (!username) return null;
      let user = await DB.User.findOne({ username }).lean();
      user.profilePic = user.smallPic;
      return user;
    },
    liked: async ({ _id }, args, { req: { username } }, info) => {
      return await DB.CommentLike.exists({
        mediaType: VIDEO_MEDIA_TYPE_ID,
        username,
        commentId: _id,
      });
    },
    disliked: async ({ _id }, args, { req: { username } }, info) => {
      return await DB.CommentDislike.exists({
        mediaType: VIDEO_MEDIA_TYPE_ID,
        username,
        commentId: _id,
      });
    },
    video: async ({ mediaId }, args, context) => {
      return await DB.Media.findOne({
        _id: mediaId,
        mediaType: VIDEO_MEDIA_TYPE_ID,
      }).lean();
    },
  },
  UserResponse: {
    likeCount: async ({ username }, args, { req: { active } }) => {
      if (!active) return null;

      return await DB.Like.find({ username }).countDocuments();
    },
    dislikeCount: async ({ username }, args, { req: { active } }) => {
      if (!active) return null;

      return await DB.Dislike.find({ username }).countDocuments();
    },
    likes: async ({ username, likePage }, args, { req: { active } }) => {
      if (!active) return null;

      if (!likePage) likePage = 0;

      return await DB.Like.find({ username })
        .sort({ createdAt: -1 })
        .skip(likePage * perPage)
        .limit(perPage)
        .lean();
    },
    dislikes: async ({ username, dislikePage }, args, { req: { active } }) => {
      if (!active) return null;

      if (!dislikePage) dislikePage = 0;

      return await DB.Dislike.find({ username })
        .sort({ createdAt: -1 })
        .skip(dislikePage * perPage)
        .limit(perPage)
        .lean();
    },
    notifications: async (
      parent,
      args,
      { req: { username, active } },
      info
    ) => {
      if (!active) return [];

      const notifications = await DB.Notification.find({
        receiver: username,
      })
        .sort({
          createdAt: -1,
        })
        .limit(1000)
        .lean();
      return notifications;
    },
    comments: async (
      { username, commentPage },
      args,
      { req: { active } },
      info
    ) => {
      if (!active) return null;

      if (!commentPage) commentPage = 0;

      return await DB.Comment.find({ username })
        .sort({ createdAt: -1 })
        .skip(commentPage * perPage)
        .limit(perPage)
        .lean();
    },
    commentCount: async ({ username }, args, { req: { active } }, info) => {
      if (!active) return null;

      return await DB.Comment.find({ username }).countDocuments();
    },
    videoCount: async ({ username }, args, { req: { active } }, info) => {
      if (!active) return null;

      return await DB.Media.find({
        username,
        mediaType: VIDEO_MEDIA_TYPE_ID,
      }).countDocuments();
    },
    imageCount: async ({ username }, args, { req: { active } }, info) => {
      if (!active) return null;

      return await DB.Media.find({
        username,
        mediaType: IMAGE_MEDIA_TYPE_ID,
      }).countDocuments();
    },
    noteCount: async ({ username }, args, { req: { active } }, info) => {
      if (!active) return null;

      return await DB.Media.find({
        username,
        mediaType: NOTE_MEDIA_TYPE_ID,
      }).countDocuments();
    },
    notes: async ({ username, notePage }, args, { req: { active } }, info) => {
      if (!active) return null;

      if (!notePage) notePage = 0;

      const notes = await DB.Media.find({
        username,
        mediaType: NOTE_MEDIA_TYPE_ID,
      })
        .sort({
          uploadedAt: -1,
        })
        .skip(notePage * perPage)
        .limit(perPage)
        .select({
          likeCount: 1,
          dislikeCount: 1,
          commentCount: 1,
          username: 1,
          caption: 1,
          uploadedAt: 1,
          _id: 1,
        })
        .lean();

      return notes;
    },
    images: async ({ username, imgPage }, args, { req: { active } }, info) => {
      if (!active) return null;

      if (!imgPage) imgPage = 0;

      const images = await DB.Media.find({
        username,
        mediaType: IMAGE_MEDIA_TYPE_ID,
      })
        .sort({
          uploadedAt: -1,
        })
        .skip(imgPage * perPage)
        .limit(perPage)
        .select({
          likeCount: 1,
          dislikeCount: 1,
          commentCount: 1,
          username: 1,
          url: 1,
          title: 1,
          caption: 1,
          uploadedAt: 1,
          _id: 1,
        })
        .lean();

      return images;
    },
    videos: async ({ username, vidPage }, args, { req: { active } }, info) => {
      if (!active) return null;

      if (!vidPage) vidPage = 0;

      const videos = await DB.Media.find({
        username,
        mediaType: VIDEO_MEDIA_TYPE_ID,
      })
        .sort({
          uploadedAt: -1,
        })
        .skip(vidPage * perPage)
        .limit(perPage)
        .select({
          likeCount: 1,
          dislikeCount: 1,
          commentCount: 1,
          username: 1,
          url: 1,
          thumbUrl: 1,
          title: 1,
          caption: 1,
          viewCount: 1,
          uploadedAt: 1,
          _id: 1,
        })
        .lean();

      return videos;
    },
    charges: async ({ username }, args, { req: { authorized } }) => {
      const charges = await DB.Charge.find({ username }).lean();
      return charges;
    },
    subscriptions: async ({ username }, args, { req: { authorized } }) => {
      const subs = await DB.Subscription.find({ username }).lean();
      return subs;
    },
    nextBillDate: async ({ username, activeUntil }) => {
      if (activeUntil) {
        return null;
      }

      const sub = await DB.Subscription.findOne({
        username,
        terminated: false,
      });

      if (!sub) return null;

      const subId = sub.stripeSubscriptionId;

      const stripeSubObj = await stripe.subscriptions.retrieve(subId);

      if (stripeSubObj.status == "trialing") {
        return new Date(stripeSubObj.trial_end * 1000);
      } else {
        return new Date(stripeSubObj.current_period_end * 1000);
      }
    },
  },
  Subscription: {
    notifications: {
      subscribe: (parent, { username }, { pubsub }, info) => {
        return pubsub.asyncIterator(
          NOTIFICATION_SUBSCRIPTION_PREFIX + username
        );
      },
    },
    newsfeedVideos: {
      subscribe: (parent, args, { pubsub }, info) => {
        return pubsub.asyncIterator(NEWSFEED_VIDEO_SUBSCRIPTION_PREFIX);
      },
    },
    newsfeedVideoItem: {
      subscribe: (parent, { videoId }, { pubsub }, info) => {
        return pubsub.asyncIterator(
          NEWSFEED_VIDEO_SUBSCRIPTION_PREFIX + videoId
        );
      },
    },
    videoItem: {
      subscribe: (parent, { videoId }, { pubsub }, info) => {
        return pubsub.asyncIterator(VIDEO_SUBSCRIPTION_PREFIX + videoId);
      },
    },
    newsfeedImages: {
      subscribe: (parent, args, { pubsub }, info) => {
        return pubsub.asyncIterator(NEWSFEED_IMAGE_SUBSCRIPTION_PREFIX);
      },
    },
    newsfeedImageItem: {
      subscribe: (parent, { imageId }, { pubsub }, info) => {
        return pubsub.asyncIterator(
          NEWSFEED_IMAGE_SUBSCRIPTION_PREFIX + imageId
        );
      },
    },
    imageItem: {
      subscribe: (parent, { imageId }, { pubsub }, info) => {
        return pubsub.asyncIterator(IMAGE_SUBSCRIPTION_PREFIX + imageId);
      },
    },
    newsfeedNotes: {
      subscribe: (parent, args, { pubsub }, info) => {
        return pubsub.asyncIterator(NEWSFEED_NOTE_SUBSCRIPTION_PREFIX);
      },
    },
    newsfeedNoteItem: {
      subscribe: (parent, { noteId }, { pubsub }, info) => {
        return pubsub.asyncIterator(NEWSFEED_NOTE_SUBSCRIPTION_PREFIX + noteId);
      },
    },
    noteItem: {
      subscribe: (parent, { noteId }, { pubsub }, info) => {
        return pubsub.asyncIterator(NOTE_SUBSCRIPTION_PREFIX + noteId);
      },
    },
  },
};

export default resolvers;
