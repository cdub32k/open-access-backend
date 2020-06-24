import User from "../database/models/user";
import Notification from "../database/models/notification";

export async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

export async function deleteReplies(Type, comm, vid) {
  let replies = await Type.find({ replyId: comm._id });
  let totalDecr = 0;
  if (replies && replies.length) {
    totalDecr += replies.length;
    await asyncForEach(replies, async (reply) => {
      totalDecr += await deleteReplies(Type, reply, vid);
      await reply.delete();
    });
  }
  return totalDecr;
}

export function parseHashtags(str) {
  let tags = str.match(/(#[a-z\d-]+)/g);
  if (tags) return tags.map((tag) => tag.slice(1).toLowerCase());
  else return [];
}

export function convertQueryToRegex(str) {
  return new RegExp(
    str
      .split(",")
      .map((term) => term.trim())
      .filter((term) => term)
      .join("|"),
    "gi"
  );
}

export async function parseLinks(str, creator, mediaType, mediaId, commentId) {
  return await converAtMentionsToLinks(
    convertHashtagsToLinks(str),
    creator,
    mediaType,
    mediaId,
    commentId
  );
}

export function convertHashtagsToLinks(str) {
  return str
    .replace(/</g, "&lt")
    .replace(/>/g, "&gt")
    .replace(
      /(#[a-z0-9_-]+)/g,
      (match) => `<a href='/search?h=${match.slice(1)}'>${match}</a>`
    );
}

export function parseVideoTimestampsToLinks(videoId, str) {
  return str.replace(
    /(?:([0-5]?[0-9]):)?([0-5]?[0-9]):([0-5][0-9])/g,
    (match, h, m, s) =>
      `<a onclick="vidJump('${videoId}', ${h},${m},${s})">${match}</a>`
  );
}

async function replaceAsync(str, regex, asyncFn) {
  const promises = [];
  str.replace(regex, (match, ...args) => {
    const promise = asyncFn(match, ...args);
    promises.push(promise);
  });
  const data = await Promise.all(promises);
  return str.replace(regex, () => data.shift());
}

export async function converAtMentionsToLinks(
  str,
  creator,
  mediaType,
  mediaId,
  commentId
) {
  let sentNotifs = {};
  return replaceAsync(str, /@[a-z0-9_-]{3,16}/g, async (match) => {
    let username = match.slice(1);
    if (await User.exists({ username })) {
      if (!sentNotifs[username]) {
        await sendAtMentionNotification(
          creator,
          username,
          mediaType,
          mediaId,
          commentId
        );
        sentNotifs[username] = true;
      }
      return `<a href='/profile/${match.slice(1)}'>${match}</a>`;
    }

    return match;
  });
}

export async function sendAtMentionNotification(
  sender,
  receiver,
  mediaType,
  mediaId,
  commentId
) {
  await Notification.create({
    sender,
    receiver,
    type: "mention",
    target: mediaType,
    targetId: mediaId,
    commentId,
  });
}
