import dotenv from "dotenv";
dotenv.config();

import { NSub } from "../database";

const router = require("express").Router();

router.post("/", async (req, res) => {
  const sub = await NSub.create({
    email: req.body.email,
  });

  if (sub) res.status(200).send(true);
  else res.status(500).send(false);
});

export default router;
