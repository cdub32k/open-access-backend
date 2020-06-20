import dotenv from "dotenv";
dotenv.config();

const router = require("express").Router();

const stripe = require("stripe")(process.env.STRIPE_SK);

const { User, Charge, Subscription } = require("../database");

import { Mailer } from "../mailer";

router.post("/process-payment", async (req, res) => {
  try {
    const {
      username,
      email,
      authorized,
      body: { payment_method, subscribed },
    } = req;

    const user = await User.findOne({ username });
    if (!user) return res.status(404).send({ error: "User not found." });

    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        payment_method,
        email,
        invoice_settings: {
          default_payment_method: payment_method,
        },
      });
      user.stripeCustomerId = customer.id;
      user.stripePaymentMethodId = payment_method;
    }
    user.active = true;

    if (subscribed) {
      const subscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId,
        items: [{ plan: process.env.STRIPE_SUB_ID }],
        expand: ["latest_invoice.payment_intent"],
        trial_end: Math.round(new Date(user.activeUntil).getTime() / 1000),
      });

      const sub = await Subscription.create({
        stripeSubscriptionId: subscription.id,
        stripePlanId: subscription.plan.id,
        stripeCustomerId: subscription.customer,
        username,
        amount: 2500,
      });
      user.activeUntil = null;
      await user.save();

      if (process.env.NODE_ENV == "production") {
        Mailer.paymentReceipt(user, sub);
      }

      return res.send({
        subscription: { _id: sub._id },
      });
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

      let start;
      if (new Date(user.activeUntil) > new Date())
        start = new Date(user.activeUntil);
      else start = new Date();

      user.activeUntil = new Date(start.setMonth(start.getMonth() + 1));
      await user.save();

      if (process.env.NODE_ENV == "production") {
        Mailer.paymentReceipt(user, charge);
      }

      return res.send({ charge: { _id: charge._id } });
    }
  } catch (err) {
    return res.status(500).send({ error: "Something went wrong." });
  }
});

router.delete("/subscription", async (req, res) => {
  try {
    const { username, authorized } = req;

    const sub = await Subscription.findOne({ username, terminated: false });

    if (!sub) return res.status(200).send(true);

    sub.terminated = true;
    sub.terminatedAt = new Date();

    const subId = sub.stripeSubscriptionId;

    // to immediately cancel (and will have to refund balance):
    // stripe.subscriptions.del('sub_49ty4767H20z6a');
    const stripeSubObj = await stripe.subscriptions.retrieve(subId);
    await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
    await sub.save();
    let user = await User.findOne({ username });
    let periodEnd = new Date(stripeSubObj.current_period_end * 1000);
    let trialEnd = new Date(stripeSubObj.trial_end * 1000);

    user.activeUntil = trialEnd > periodEnd ? trialEnd : periodEnd;

    await user.save();

    if (process.env.NODE_ENV == "production") {
      Mailer.unsubscribed(user, sub);
    }

    return res.status(200).send(true);
  } catch (e) {
    return res.status(500).send({ error: "Something went wrong." });
  }
});

router.patch("/subscription", async (req, res) => {
  /*
    reactivate a cancelled subscription here:
    
    const subscription = await stripe.subscriptions.retrieve('sub_49ty4767H20z6a');
    stripe.subscriptions.update('sub_49ty4767H20z6a', {
      cancel_at_period_end: false,
      proration_behavior: 'create_prorations',
      items: [{
        id: subscription.items.data[0].id,
        price: 'price_CBb6IXqvTLXp3f',
      }]
    });
  */
});

export default router;
