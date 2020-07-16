import dotenv from "dotenv";
dotenv.config();

import fs from "fs";

import DB from "../src/database";

import aws from "aws-sdk";
aws.config.region = "us-west-1";
const s3 = new aws.S3();
const S3_BUCKET = process.env.S3_BUCKET;

import sharp from "sharp";
import { loremIpsum } from "lorem-ipsum";

import {
  VIDEO_MEDIA_TYPE_ID,
  IMAGE_MEDIA_TYPE_ID,
  NOTE_MEDIA_TYPE_ID,
} from "../src/constants";

import { asyncForEach } from "../src/utils/helpers";
let words = [
  "@member9",
  "@member0",
  "@member1",
  "@member2",
  "@member3",
  "@member4",
  "@member5",
  "@member6",
  "@member7",
  "@member8",
  "#fossil",
  "#screw",
  "#age",
  "#skip",
  "#resolution",
  "#progressive",
  "#housewife",
  "#powder",
  "#hurl",
  "#ward",
  "#jaw",
  "#poetry",
  "#calculation",
  "#filter",
  "#parachute",
  "#offend",
  "#inject",
  "#circumstance",
  "#civilian",
  "#agency",
  "#abnormal",
  "#suit",
  "#assessment",
  "#invasion",
  "#east",
  "#respectable",
  "#room",
  "#snail",
  "#heir",
  "#opposed",
  "#plastic",
  "#avenue",
  "#jungle",
  "#hard",
  "#average",
  "#memorandum",
  "#mainstream",
  "#cage",
  "#art",
  "#model",
  "#nap",
  "#multimedia",
  "#cute",
  "#create",
  "#stubborn",
  "#flock",
  "vivacious",
  "#stuff",
  "#horses",
  "repair",
  "avoid",
  "muscle",
  "touch",
  "impartial",
  "bit",
  "flower",
  "watery",
  "#flowers",
  "base",
  "temporary",
  "friendly",
  "wealth",
  "#wood",
  "loss",
  "the",
  "a",
  "it",
  "he",
  "she",
  "go",
  "to",
  "at",
  "all",
  "little",
  "hindrance",
  "chilly",
  "tiger",
  "babies",
  "thank",
  "#enthusiastic",
  "riddle",
  "windy",
  "bait",
  "brake",
  "hover",
  "spotted",
  "cow",
  "volleyball",
  "breathe",
  "ordinary",
  "verse",
  "groovy",
  "scorch",
  "harmonious",
  "laughable",
  "malicious",
  "zip",
  "ink",
  "aggressive",
  "#vacation",
  "pray",
  "permissible",
  "faded",
  "rob",
  "woebegone",
  "shame",
  "crown",
  "brown",
  "abnormal",
  "guarded",
  "drum",
  "stale",
  "school",
  "confused",
  "curious",
  "dam",
  "point",
  "new",
  "fetch",
  "receipt",
  "decisive",
  "knit",
  "damp",
  "#earsplitting",
  "distribution",
  "handy",
  "#disgusting",
  "trousers",
  "nauseating",
  "bake",
  "war",
  "#fog",
  "annoying",
  "bright",
  "wacky",
  "cloudy",
  "queen",
  "shrug",
  "badge",
  "haircut",
  "boot",
  "#dinosaurs",
  "rotten",
  "harbor",
  "craven",
  "gentle",
  "zipper",
  "special",
  "murky",
  "angle",
  "lacking",
  "pollution",
  "wilderness",
  "unused",
  "frightened",
  "thing",
  "unadvised",
  "cherry",
  "wide-eyed",
  "vengeful",
  "fairies",
  "wash",
  "uneven",
  "lazy",
  "brawny",
  "#efficient",
  "profuse",
  "#wire",
  "fixed",
  "imagine",
  "obey",
  "stage",
  "hang",
  "expansion",
  "home",
  "strong",
  "glow",
  "crawl",
  "stamp",
  "caring",
  "overjoyed",
  "discreet",
  "label",
  "subtract",
  "automatic",
  "gate",
  "#spiky",
  "truculent",
  "slow",
  "bruise",
  "push",
  "colour",
  "decision",
  "scold",
  "helpful",
  "release",
  "visit",
  "#shallow",
  "mark",
  "bulb",
  "spray",
  "mindless",
  "loose",
  "#fortunate",
  "aware",
  "replace",
  "sweltering",
  "#machine",
  "#summer",
  "sigh",
  "carve",
  "disagree",
  "solid",
  "examine",
  "trick",
  "lock",
  "report",
  "property",
  "concern",
  "reign",
  "green",
  "#parallel",
  "#development",
  "wander",
  "morning",
  "plucky",
  "insect",
  "violent",
  "#busy",
  "laborer",
  "beds",
  "bare",
  "delight",
  "#juvenile",
  "#amused",
  "earthy",
  "disgusted",
  "#bizarre",
  "groan",
  "lush",
  "sponge",
  "#icicle",
  "chop",
];

const NUM_VIDS = 21;
const NUM_IMAGES = 21;
const NUM_NOTES = 20;
const NUM_VID_COMMENTS = 200;
const NUM_IMAGE_COMMENTS = 200;
const NUM_NOTE_COMMENTS = 200;

const USER_VIDEO_LIKES = 12;
const USER_IMAGE_LIKES = 12;
const USER_NOTE_LIKES = 12;
const USER_VIDEO_DISLIKES = 10;
const USER_IMAGE_DISLIKES = 10;
const USER_NOTE_DISLIKES = 10;
const USER_VIDEO_COMMENT_LIKES = 50;
const USER_IMAGE_COMMENT_LIKES = 50;
const USER_NOTE_COMMENT_LIKES = 50;
const USER_VIDEO_COMMENT_DISLIKES = 50;
const USER_IMAGE_COMMENT_DISLIKES = 50;
const USER_NOTE_COMMENT_DISLIKES = 50;

function gen3Words() {
  return loremIpsum({
    count: Math.ceil(Math.random() * 3),
    words,
    units: "words",
  });
}

function gen2Pars() {
  let options = {
    count: Math.ceil(Math.random() * 2),
    words,
    paragraphLowerBound: 1,
    paragraphUpperBound: 8,
    suffix: "\n\n",
    units: "paragraphs",
  };
  let pars = loremIpsum(options);
  while (pars.length > 800) pars = loremIpsum(options);
  return pars;
}
function gen3Pars() {
  let options = {
    count: Math.ceil(Math.random() * 3),
    words,
    paragraphLowerBound: 1,
    paragraphUpperBound: 8,
    suffix: "\n\n",
    units: "paragraphs",
  };
  let pars = loremIpsum(options);
  while (pars.length > 800) pars = loremIpsum(options);
  return pars;
}
function gen5Pars() {
  let options = {
    count: Math.ceil(Math.random() * 5),
    words,
    paragraphLowerBound: 1,
    paragraphUpperBound: 8,
    suffix: "\n\n",
    units: "paragraphs",
  };
  let pars = loremIpsum(options);
  while (pars.length > 1980) pars = loremIpsum(options);
  return pars;
}
function gen2Sens() {
  let options = {
    count: Math.ceil(Math.random() * 2),
    words,
    sentenceLowerBound: 2,
    sentenceUpperBound: 16,
    suffix: "\n\n",
    units: "sentences",
  };
  let sens = loremIpsum(options);
  while (sens.length > 120) sens = loremIpsum(options);
  return sens;
}

(async () => {
  await DB.User.deleteMany({});

  for (let i = 0; i < 10; i++) {
    let profLarge = await sharp(
      __dirname + `/seed_data/images/profile-pics/profile${i}.jpg`
    );
    const metaData = await profLarge.metadata();
    if (metaData.width > 856) {
      profLarge = await profLarge.resize(856, 856);
    }
    profLarge = await profLarge.jpeg({
      progressive: true,
      compressionLevel: 8,
      adaptiveFiltering: true,
    });

    let profSmall = await sharp(
      __dirname + `/seed_data/images/profile-pics/profile${i}.jpg`
    )
      .resize(98, 98)
      .jpeg({
        progressive: true,
        compressionLevel: 8,
        adaptiveFiltering: true,
      });

    let fileName = `thumb-profile.${Date.now()}.jpg`;
    let thumbName = `small-${fileName}`;

    let s3Params = {
      Bucket: S3_BUCKET,
      Key: `img/member${i}/${fileName}`,
      Body: profLarge,
      ACL: "public-read",
    };
    let s3Params2 = {
      Bucket: S3_BUCKET,
      Key: `img/member${i}/${thumbName}`,
      Body: profSmall,
      ACL: "public-read",
    };
    await Promise.all([
      s3.upload(s3Params).promise(),
      s3.upload(s3Params2).promise(),
      DB.User.create({
        joinedAt: Date.now(),
        active: true,
        activeUntil: null,
        username: `member${i}`,
        email: `member${i}@mail.com`,
        displayName: gen3Words(),
        bio: gen3Pars(),
        passwordHash:
          "$2a$08$zQYLLxdHQdvhQKrC8drmIue.OzyopZwZd8x.KulGqWqj8ma1IaZPq",
        profilePic: `https://${S3_BUCKET}.s3.amazonaws.com/img/member${i}/${fileName}`,
        smallPic: `https://${S3_BUCKET}.s3.amazonaws.com/img/member${i}/${thumbName}`,
      }),
    ]);
  }

  await DB.Media.deleteMany({});

  let members = [
    "member1",
    "member2",
    "member3",
    "member4",
    "member5",
    "member6",
    "member7",
    "member8",
    "member9",
    "member0",
  ];
  let videoIds = [];
  let videoCommentIds = [];
  let imageIds = [];
  let imageCommentIds = [];
  let noteIds = [];
  let noteCommentIds = [];

  for (let i = 1; i <= NUM_VIDS; i++) {
    let fileName = `${Date.now()}`;
    let s3VidParams = {
      Bucket: S3_BUCKET,
      Key: `vid/member1/${fileName}.m4v`,
      Body: fs.createReadStream(__dirname + `/seed_data/videos/video${i}.m4v`),
      ACL: "public-read",
    };
    let s3ThumbParams = {
      Bucket: S3_BUCKET,
      Key: `vid/member1/thumb-${fileName}.jpg`,
      Body: await sharp(__dirname + `/seed_data/videos/thumb${i}.jpg`)
        .resize(856, 482)
        .jpeg({
          progressive: true,
          compressionLevel: 6,
          adaptiveFiltering: true,
        })
        .toBuffer(),
      ACL: "public-read",
    };

    await s3.upload(s3VidParams).promise();
    await s3.upload(s3ThumbParams).promise();

    let title = gen2Sens();
    let caption = gen5Pars();

    let vid = await DB.Media.create({
      mediaType: VIDEO_MEDIA_TYPE_ID,
      username: "member1",
      url: `https://${S3_BUCKET}.s3.amazonaws.com/vid/member1/${fileName}.m4v`,
      thumbUrl: `https://${S3_BUCKET}.s3.amazonaws.com/vid/member1/thumb-${fileName}.jpg`,
      title,
      caption: `Check out 00:0${Math.ceil(Math.random() * 10)}! ` + caption,
      hashtags: [],
    });

    videoIds.push(vid._id);
  }

  for (let i = 1; i <= NUM_VID_COMMENTS; i++) {
    let mediaId = videoIds[Math.floor(Math.random() * videoIds.length)];
    await DB.Media.updateOne({ _id: mediaId }, { $inc: { commentCount: 1 } });

    let replyId;
    if (Math.random() * 10 < 3.2 && videoCommentIds.length)
      replyId =
        videoCommentIds[Math.floor(Math.random() * videoCommentIds.length)][0];
    else replyId = null;

    if (replyId)
      await DB.Comment.updateOne({ _id: replyId }, { $inc: { replyCount: 1 } });

    let c = await DB.Comment.create({
      mediaType: VIDEO_MEDIA_TYPE_ID,
      username: members[Math.floor(Math.random() * members.length)],
      mediaId,
      body:
        Math.random() < 0.25
          ? `Check out 00:0${Math.ceil(Math.random() * 10)}! ` +
            gen2Pars().substring(20)
          : gen2Pars(),
      replyId,
    });
    videoCommentIds.push([c._id, mediaId]);
  }

  await asyncForEach(members, async (member) => {
    let vidsForMember = [...videoIds];
    for (let i = 0; i < USER_VIDEO_LIKES; i++) {
      let mediaId =
        vidsForMember[Math.floor(Math.random() * vidsForMember.length)];
      vidsForMember.splice(vidsForMember.indexOf(mediaId), 1);
      await DB.Media.updateOne({ _id: mediaId }, { $inc: { likeCount: 1 } });
      await DB.Like.create({
        mediaType: VIDEO_MEDIA_TYPE_ID,
        username: member,
        mediaId,
      });
    }
    vidsForMember = [...videoIds];
    for (let i = 0; i < USER_VIDEO_DISLIKES; i++) {
      let mediaId =
        vidsForMember[Math.floor(Math.random() * vidsForMember.length)];
      vidsForMember.splice(vidsForMember.indexOf(mediaId), 1);
      await DB.Media.updateOne({ _id: mediaId }, { $inc: { dislikeCount: 1 } });
      await DB.Dislike.create({
        mediaType: VIDEO_MEDIA_TYPE_ID,
        username: member,
        mediaId,
      });
    }
    let commsForMember = [...videoCommentIds];
    for (let i = 0; i < USER_VIDEO_COMMENT_LIKES; i++) {
      let [commentId, mediaId] = commsForMember[
        Math.floor(Math.random() * commsForMember.length)
      ];
      commsForMember.splice(
        commsForMember.findIndex((c) => c[0] == commentId),
        1
      );
      await DB.Comment.updateOne(
        { _id: commentId },
        { $inc: { likeCount: 1 } }
      );
      await DB.CommentLike.create({
        mediaType: VIDEO_MEDIA_TYPE_ID,
        username: member,
        mediaId,
        commentId,
      });
    }
    commsForMember = [...videoCommentIds];
    for (let i = 0; i < USER_VIDEO_COMMENT_DISLIKES; i++) {
      let [commentId, mediaId] = commsForMember[
        Math.floor(Math.random() * commsForMember.length)
      ];
      commsForMember.splice(
        commsForMember.findIndex((c) => c[0] == commentId),
        1
      );
      await DB.Comment.updateOne(
        { _id: commentId },
        { $inc: { dislikeCount: 1 } }
      );
      await DB.CommentDislike.create({
        mediaType: VIDEO_MEDIA_TYPE_ID,
        username: member,
        mediaId,
        commentId,
      });
    }
  });

  for (let i = 1; i <= NUM_IMAGES; i++) {
    let fileName = `${Date.now()}`;
    let s3ImageParams = {
      Bucket: S3_BUCKET,
      Key: `img/member1/thumb-${fileName}.jpg`,
      Body: await sharp(__dirname + `/seed_data/images/image${i}.jpg`)
        .resize(856, 856)
        .jpeg({
          progressive: true,
          compressionLevel: 6,
          adaptiveFiltering: true,
        })
        .toBuffer(),
      ACL: "public-read",
    };
    await s3.upload(s3ImageParams).promise();

    let title = gen2Sens();
    let caption = gen5Pars();

    let image = await DB.Media.create({
      mediaType: IMAGE_MEDIA_TYPE_ID,
      username: "member1",
      url: `https://${S3_BUCKET}.s3.amazonaws.com/img/member1/thumb-${fileName}.jpg`,
      title,
      caption,
      hashtags: [],
    });

    imageIds.push(image._id);
  }

  for (let i = 1; i <= NUM_IMAGE_COMMENTS; i++) {
    let mediaId = imageIds[Math.floor(Math.random() * imageIds.length)];
    await DB.Media.updateOne({ _id: mediaId }, { $inc: { commentCount: 1 } });

    let replyId;
    if (Math.random() * 10 < 3.2 && imageCommentIds.length)
      replyId =
        imageCommentIds[Math.floor(Math.random() * imageCommentIds.length)][0];
    else replyId = null;

    if (replyId)
      await DB.Comment.updateOne({ _id: replyId }, { $inc: { replyCount: 1 } });

    let c = await DB.Comment.create({
      mediaType: IMAGE_MEDIA_TYPE_ID,
      username: members[Math.floor(Math.random() * members.length)],
      mediaId,
      body: gen2Pars(),
      replyId,
    });
    imageCommentIds.push([c._id, mediaId]);
  }

  await asyncForEach(members, async (member) => {
    let imagesForMember = [...imageIds];
    for (let i = 0; i < USER_IMAGE_LIKES; i++) {
      let mediaId =
        imagesForMember[Math.floor(Math.random() * imagesForMember.length)];
      imagesForMember.splice(imagesForMember.indexOf(mediaId), 1);
      await DB.Media.updateOne({ _id: mediaId }, { $inc: { likeCount: 1 } });
      await DB.Like.create({
        mediaType: IMAGE_MEDIA_TYPE_ID,
        username: member,
        mediaId,
      });
    }
    imagesForMember = [...imageIds];
    for (let i = 0; i < USER_IMAGE_DISLIKES; i++) {
      let mediaId =
        imagesForMember[Math.floor(Math.random() * imagesForMember.length)];
      imagesForMember.splice(imagesForMember.indexOf(mediaId), 1);
      await DB.Media.updateOne({ _id: mediaId }, { $inc: { dislikeCount: 1 } });
      await DB.Dislike.create({
        mediaType: IMAGE_MEDIA_TYPE_ID,
        username: member,
        mediaId,
      });
    }
    let commsForMember = [...imageCommentIds];
    for (let i = 0; i < USER_IMAGE_COMMENT_LIKES; i++) {
      let [commentId, mediaId] = commsForMember[
        Math.floor(Math.random() * commsForMember.length)
      ];
      commsForMember.splice(
        commsForMember.findIndex((c) => c[0] == commentId),
        1
      );
      await DB.Comment.updateOne(
        { _id: commentId },
        { $inc: { likeCount: 1 } }
      );
      await DB.CommentLike.create({
        mediaType: IMAGE_MEDIA_TYPE_ID,
        username: member,
        mediaId,
        commentId,
      });
    }
    commsForMember = [...imageCommentIds];
    for (let i = 0; i < USER_IMAGE_COMMENT_DISLIKES; i++) {
      let [commentId, mediaId] = commsForMember[
        Math.floor(Math.random() * commsForMember.length)
      ];
      commsForMember.splice(
        commsForMember.findIndex((c) => c[0] == commentId),
        1
      );
      await DB.Comment.updateOne(
        { _id: commentId },
        { $inc: { dislikeCount: 1 } }
      );
      await DB.CommentDislike.create({
        mediaType: IMAGE_MEDIA_TYPE_ID,
        username: member,
        mediaId,
        commentId,
      });
    }
  });

  for (let i = 1; i <= 100; i++) {
    let caption = gen3Pars();
    let note = await DB.Media.create({
      mediaType: NOTE_MEDIA_TYPE_ID,
      caption,
      username: "member1",
      hashtags: [],
    });

    noteIds.push(note._id);
  }

  for (let i = 1; i <= NUM_NOTE_COMMENTS; i++) {
    let mediaId = noteIds[Math.floor(Math.random() * noteIds.length)];
    await DB.Media.updateOne({ _id: mediaId }, { $inc: { commentCount: 1 } });

    let replyId;
    if (Math.random() * 10 < 3.2 && noteCommentIds.length)
      replyId =
        noteCommentIds[Math.floor(Math.random() * noteCommentIds.length)][0];
    else replyId = null;

    if (replyId)
      await DB.Comment.updateOne({ _id: replyId }, { $inc: { replyCount: 1 } });

    let c = await DB.Comment.create({
      mediaType: NOTE_MEDIA_TYPE_ID,
      username: members[Math.floor(Math.random() * members.length)],
      mediaId,
      body: gen2Pars(),
      replyId,
    });
    noteCommentIds.push([c._id, mediaId]);
  }

  await asyncForEach(members, async (member) => {
    let notesForMember = [...noteIds];
    for (let i = 0; i < USER_NOTE_LIKES; i++) {
      let mediaId =
        notesForMember[Math.floor(Math.random() * notesForMember.length)];
      notesForMember.splice(notesForMember.indexOf(mediaId), 1);
      await DB.Media.updateOne({ _id: mediaId }, { $inc: { likeCount: 1 } });
      await DB.Like.create({
        mediaType: NOTE_MEDIA_TYPE_ID,
        username: member,
        mediaId,
      });
    }
    notesForMember = [...noteIds];
    for (let i = 0; i < USER_NOTE_DISLIKES; i++) {
      let mediaId =
        notesForMember[Math.floor(Math.random() * notesForMember.length)];
      notesForMember.splice(notesForMember.indexOf(mediaId), 1);
      await DB.Media.updateOne({ _id: mediaId }, { $inc: { dislikeCount: 1 } });
      await DB.Dislike.create({
        mediaType: NOTE_MEDIA_TYPE_ID,
        username: member,
        mediaId,
      });
    }
    let commsForMember = [...noteCommentIds];
    for (let i = 0; i < USER_NOTE_COMMENT_LIKES; i++) {
      let [commentId, mediaId] = commsForMember[
        Math.floor(Math.random() * commsForMember.length)
      ];
      commsForMember.splice(
        commsForMember.findIndex((c) => c[0] == commentId),
        1
      );
      await DB.Comment.updateOne(
        { _id: commentId },
        { $inc: { likeCount: 1 } }
      );
      await DB.CommentLike.create({
        mediaType: NOTE_MEDIA_TYPE_ID,
        username: member,
        mediaId,
        commentId,
      });
    }
    commsForMember = [...noteCommentIds];
    for (let i = 0; i < USER_NOTE_COMMENT_DISLIKES; i++) {
      let [commentId, mediaId] = commsForMember[
        Math.floor(Math.random() * commsForMember.length)
      ];
      commsForMember.splice(
        commsForMember.findIndex((c) => c[0] == commentId),
        1
      );
      await DB.Comment.updateOne(
        { _id: commentId },
        { $inc: { dislikeCount: 1 } }
      );
      await DB.CommentDislike.create({
        mediaType: NOTE_MEDIA_TYPE_ID,
        username: member,
        mediaId,
        commentId,
      });
    }
  });

  await DB.disconnect();
})();
