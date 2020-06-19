import dotenv from "dotenv";
dotenv.config();

const { User } = require("../database");

const router = require("express").Router();

router.put("/", async (req, res) => {
  try {
    let user = await User.findOne({ username: req.username });
    Object.assign(user, req.body);
    await user.save();

    res.send({
      user: {
        displayName: user.displayName,
        profilePic: user.profilePic,
        email: user.email,
        username: user.username,
        phoneNumber: user.phoneNumber,
        bio: user.bio,
      },
    });
  } catch (error) {
    return res.status(500).send({ error: "Something went wrong" });
  }
});

router.post("");

export default router;
