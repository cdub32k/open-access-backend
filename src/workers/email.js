import dotenv from "dotenv";
dotenv.config();
import throng from "throng";
import emailQueue from "../queues/email";

import sgMail from "@sendgrid/mail";
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

let maxJobsPerWorker = 2;

function start() {
  emailQueue.process(maxJobsPerWorker, function (job, done) {
    sgMail
      .send(job.data)
      .then(() => done())
      .catch((e) => {
        console.log(`failed to send email to ${username}:`, e);
        done(new Error());
      });
  });
}

throng({ workers: process.env.WEB_CONCURRENCY || 2, start });
