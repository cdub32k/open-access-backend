import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./models/user";
import Charge from "./models/charge";
import Subscription from "./models/subcription";

import Media from "./models/media";
import Like from "./models/like";
import Dislike from "./models/dislike";
import CommentLike from "./models/commentLike";
import CommentDislike from "./models/commentDislike";
import Comment from "./models/comment";
import View from "./models/view";

import Notification from "./models/notification";
import NSub from "./models/nSubscriber";

dotenv.config();

class Database {
  constructor() {
    this._connect();
    this.User = User;
    this.Charge = Charge;
    this.Subscription = Subscription;

    this.Media = Media;
    this.Like = Like;
    this.Dislike = Dislike;
    this.CommentLike = CommentLike;
    this.CommentDislike = CommentDislike;
    this.Comment = Comment;
    this.View = View;

    this.Notification = Notification;
    this.NSub = NSub;
  }

  _connect() {
    mongoose
      .connect(process.env.DB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false,
      })
      .then(() => {
        console.log("Database connection successful");
      })
      .catch((err) => {
        console.error("Database connection error", process.env.DB_URL, err);
      });
  }

  disconnect() {
    mongoose
      .disconnect()
      .then(() => {
        console.log("Database disconnected successfully");
      })
      .catch((err) => {
        console.error("Error while disconnecting from database");
      });
  }
}

module.exports = new Database();
