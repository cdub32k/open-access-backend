import dotenv from "dotenv";
dotenv.config();

import dayjs from "dayjs";

import emailQueue from "./queues/email";

export class Mailer {
  static welcome(recipient) {
    const { email, username } = recipient;
    const msg = {
      to: email,
      from: "openaccess@usa.com",
      subject: `Welcome to Open Access, @${username}!`,
      text: `Good times ahead! Here is a link to your profile: ${process.env.SITE_HOST}/profile/${recipient.username}`,
      html: `Good times ahead! Here is a link to your profile: <a href="${process.env.SITE_HOST}/profile/${recipient.username}">${recipient.username}'s profile</a>`,
    };

    const options = {
      attempts: 2,
      removeOnComplete: true,
    };

    emailQueue.add(msg, options);
  }

  static paymentReceipt(recipient, payment) {
    const { email, username } = recipient;
    let _id = payment._id.toString();
    let msg;
    if (payment.stripeSubscriptionId) {
      msg = {
        to: email,
        from: "openaccess@usa.com",
        subject: `Open Access - Payment Receipt`,
        text: `Thank you, @${
          recipient.username
        }! You have subscribed to Open Access for $25/month. Confirmation #${_id
          .substring(_id.length - 8)
          .toUpperCase()}. To cancel your subscription, click the "Payment Info" link on your account information page. To dispute this charge, contact openaccess@usa.com with this confirmation # and your username.`,
        html: `Thank you, @${
          recipient.username
        }! <br/>You have subscribed to Open Access for $25/month.<br /> Confirmation #<strong>${_id
          .substring(_id.length - 8)
          .toUpperCase()}</strong>.<br/> To cancel your subscription, click the "Payment Info" link on your account information page. <br />To dispute this charge, contact <strong>openaccess@usa.com</strong> with this confirmation # and your username.<br/>Thank you,<br/>-Team`,
      };
    } else {
      msg = {
        to: email,
        from: "openaccess@usa.com",
        subject: `Open Access - Payment Receipt`,
        text: `Thank you, @${
          recipient.username
        }! You have purchased a 1 month membership to Open Access for $25. Confirmation #${_id
          .substring(_id.length - 8)
          .toUpperCase()}. Your account will remain active until ${dayjs(
          recipient.activeUntil
        ).format(
          "MM/DD/YYYY"
        )}. To dispute this charge contact openaccess@usa.com with your confirmation # and your username.`,
        html: `Thank you, @${
          recipient.username
        }!<br/> You have purchased a 1 month membership to Open Access for $25.<br/> Confirmation #${_id
          .substring(_id.length - 8)
          .toUpperCase()}.<br/> Your account will remain active until ${dayjs(
          recipient.activeUntil
        ).format(
          "MM/DD/YYYY"
        )}.<br/> To dispute this charge contact openaccess@usa.com with your confirmation # and your username.<br/>Thank you,<br/>-Team`,
      };
    }

    const options = {
      attempts: 2,
      removeOnComplete: true,
    };

    emailQueue.add(msg, options);
  }

  static unsubscribed(recipient) {
    const { email, username } = recipient;

    const msg = {
      to: email,
      from: "openaccess@usa.com",
      subject: `Open Access - Subscription Cancelled`,
      text: `Hello @${
        recipient.username
      }, Your subscription to Open Access has been cancelled. Your account will remain active until ${dayjs(
        recipient.activeUntil
      ).format("MM/DD/YYYY")}.`,
      html: `Hello @${
        recipient.username
      },<br/> Your subscription to Open Access has been cancelled.<br/> Your account will remain active until ${dayjs(
        recipient.activeUntil
      ).format("MM/DD/YYYY")}.<br/>Thank you,<br/>-Team`,
    };

    const options = {
      attempts: 2,
      removeOnComplete: true,
    };

    emailQueue.add(msg, options);
  }

  static async forgotPassword(recipient) {
    const { email, tempKey } = recipient;
    const msg = {
      to: email,
      from: "openaccess@usa.com",
      subject: `Change Password`,
      text: `Open this link to reset your password: ${process.env.SITE_HOST}/password-reset/${tempKey}`,
      html: `Click this link to reset your password: <a href="${process.env.SITE_HOST}/password-reset/${tempKey}">reset</a>`,
    };

    const options = {
      attempts: 2,
      removeOnComplete: true,
    };

    await emailQueue.add(msg, options);
  }
}
