import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
const router = require("express").Router();

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const stripe = require("stripe")(process.env.STRIPE_SK);

const { User, Charge, Subscription } = require("../database");

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username }).lean();
    if (!user) return res.status(404).send({ error: "User not found." });
    const passwordIsValid = bcrypt.compareSync(password, user.passwordHash);
    if (!passwordIsValid)
      return res.status(401).send({ auth: false, token: null });

    const token = jwt.sign(
      { username, email: user.email, profilePic: user.profilePic },
      process.env.JWT_SECRET,
      {
        expiresIn: "20s",
      }
    );

    const refreshToken = jwt.sign(
      { username },
      process.env.JWT_REFRESH_SECRET + user.passwordHash,
      {
        expiresIn: "365days",
      }
    );

    return res.status(200).send({ auth: true, token, refreshToken });
  } catch (err) {
    return res.status(500).send({ error: "Something went wrong." });
  }
});

router.post("/check-email", async (req, res) => {
  try {
    let email = req.body.email;
    let user = await User.exists({ email });

    res.state(200).send(user);
  } catch (e) {
    return res.status(500).send({ error: "Something went wrong" });
  }
});

router.post("/check-username", async (req, res) => {
  try {
    let username = req.body.username;
    let user = await User.exists({ username });

    res.status(200).send(user);
  } catch (e) {
    return res.status(500).send({ error: "Something went wrong" });
  }
});

router.post("/sign-up", async (req, res) => {
  try {
    //TODO validate email,username,password

    const { password, email, username, payment_method, subscribed } = req.body;
    const passwordHash = bcrypt.hashSync(password, 8);
    const user = await User.create({
      email,
      username,
      passwordHash,
    });

    if (!user) res.status(500).send({ error: "Error while creating user." });

    const token = jwt.sign(
      { username, email, profilePic: user.profilePic },
      process.env.JWT_SECRET,
      {
        expiresIn: "24h",
      }
    );

    const customer = await stripe.customers.create({
      payment_method,
      email,
      invoice_settings: {
        default_payment_method: payment_method,
      },
    });
    user.active = true;

    user.stripeCustomerId = customer.id;
    user.stripePaymentMethodId = payment_method;

    if (subscribed) {
      const subscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId,
        items: [{ plan: process.env.STRIPE_SUB_ID }],
        expand: ["latest_invoice.payment_intent"],
        trial_period_days: 0,
      });

      await Subscription.create({
        stripeSubscriptionId: subscription.id,
        stripePlanId: subscription.plan.id,
        stripeCustomerId: subscription.customer,
        username,
        amount: 2500,
      });
      user.activeUntil = null;
    } else {
      const result = await stripe.paymentIntents.create({
        customer: user.stripeCustomerId,
        payment_method,
        amount: 2500,
        currency: "usd",
        metadata: { integration_check: "accept_a_payment" },
        confirm: true,
      });

      const { id, amount, created } = result;

      const charge = await Charge.create({
        stripePaymentIntentId: id,
        stripePaymentMethodId: result.payment_method,
        username,
        amount,
      });

      let today = new Date();
      user.activeUntil = new Date(today.setMonth(today.getMonth() + 1));
    }
    await user.save();

    return res.status(200).send({ auth: true, token });
  } catch (err) {
    return res.status(500).send({ error: "Something went wrong." + err });
  }
});

export default router;
