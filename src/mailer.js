import dotenv from "dotenv";
dotenv.config();

import sgMail from "@sendgrid/mail";
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export class Mailer {
  static forgotPassword(recipient) {
    const { email, tempKey } = recipient;
    const msg = {
      to: email,
      from: "openaccess@usa.com",
      subject: `Change Password`,
      text: `Open this link to reset password: ${process.env.SITE_HOST}/password-reset/${tempKey}`,
      html: `Click this link to reset password: <a href="${process.env.SITE_HOST}/password-reset/${tempKey}">reset</a>`,
    };

    sgMail
      .send(msg)
      .catch((e) => console.log(`failed to send email to ${username}:`, e));
  }
}
