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
        profilePic: user.profilePic,
        email: user.email,
        username: user.username,
        phoneNumber: user.phoneNumber,
        country: user.country,
        state: user.state,
        city: user.city,
        bio: user.bio,
      },
    });
  } catch (error) {
    return res.status(500).send({ error: "Something went wrong" });
  }
});

router.post("");

export default router;
