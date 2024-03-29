import dotenv from "dotenv";
dotenv.config();
import "regenerator-runtime/runtime.js";

import { createServer } from "http";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import pubsub from "./PubSub";

import bodyParser from "body-parser";
import cors from "cors";
import compression from "compression";
import jwt from "jsonwebtoken";

import authRouter from "./routes/auth";
import userRouter from "./routes/user";
import paymentRouter from "./routes/payment";
import imageRouter from "./routes/image";
import videoRouter from "./routes/video";
import noteRouter from "./routes/note";
import newsletterRouter from "./routes/newsletter";

import typeDefs from "./typeDefs";
import resolvers from "./resolvers";

import User from "./database/models/user";

const app = express();
app.use(compression());
app.use(
  cors({
    origin: "*",
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ limit: "1000mb" }));

function requireHTTPS(req, res, next) {
  // The 'x-forwarded-proto' check is for Heroku
  if (
    !req.secure &&
    req.get("x-forwarded-proto") !== "https" &&
    process.env.NODE_ENV == "production"
  ) {
    return res.redirect("https://" + req.get("host") + req.url);
  }
  next();
}
app.use(requireHTTPS);

const verifyTokenMiddleware = (req, res, next) => {
  let token = req.headers["authorization"];
  if (!token) {
    return res.status(403).send({ error: "Forbidden" });
  }

  token = token.replace("Bearer ", "");
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      const refreshToken = req.headers["x-refresh-token"];
      if (!refreshToken) return res.status(403).send({ error: "Forbidden" });

      const { username } = jwt.decode(refreshToken);
      let user = await User.findOne({ username }).lean();

      if (
        user.active &&
        user.activeUntil &&
        new Date(user.activeUntil) < new Date()
      ) {
        user.active = false;
        await User.updateOne({ _id: user._id }, { active: false });
      }

      jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET + user.passwordHash,
        (err, decoded) => {
          if (err) return res.status(403).send({ error: "Forbidden" });
          const token = jwt.sign(
            { username, email: user.email, active: user.active },
            process.env.JWT_SECRET,
            {
              expiresIn: "1h",
            }
          );

          const refreshToken = jwt.sign(
            { username },
            process.env.JWT_REFRESH_SECRET + user.passwordHash,
            {
              expiresIn: "365days",
            }
          );
          res.set("Access-Control-Expose-Headers", "x-token, x-refresh-token");
          res.set("x-token", token);
          res.set("x-refresh-token", refreshToken);
          req.authorized = true;
          req.active = user.active;
          req.username = username;
          req.email = user.email;
          return next();
        }
      );
    } else {
      req.authorized = true;
      req.active = decoded.active;
      req.username = decoded.username;
      req.email = decoded.email;
      return next();
    }
  });
};

app.use("/mcount", async (req, res) => {
  try {
    return res
      .status(200)
      .send({ mcount: await User.find({ active: true }).countDocuments() });
  } catch (e) {
    return res.status(500).send({ error: "Something went wrong" });
  }
});

app.use("/auth", authRouter);

app.use("/users", verifyTokenMiddleware, userRouter);

app.use("/payment", verifyTokenMiddleware, paymentRouter);

app.use("/images", verifyTokenMiddleware, imageRouter);

app.use("/videos", verifyTokenMiddleware, videoRouter);

app.use("/notes", verifyTokenMiddleware, noteRouter);

app.use("/newsletter", newsletterRouter);

app.use("/api", verifyTokenMiddleware);

const gqlServer = new ApolloServer({
  cors: false,
  typeDefs,
  resolvers,
  subscriptions: {
    path: "/subs",
  },
  context: async ({ req, connection }) => {
    try {
      if (connection) return { ...connection.context, pubsub };

      return { req, pubsub };
    } catch (e) {
      req.authorized = false;
      return { req };
    }
  },
});

gqlServer.applyMiddleware({
  app,
  path: "/api",
  cors: false,
});

if (process.env.NODE_ENV == "production")
  app.use("/*", (req, res) => {
    res.sendFile(__dirname + "/index.html");
  });

const httpServer = createServer(app);
gqlServer.installSubscriptionHandlers(httpServer);

httpServer.listen({ port: process.env.PORT }, () => {
  console.log(
    `Graphql Server reading at port ${process.env.PORT}${gqlServer.graphqlPath}`
  );
  console.log(
    `Subscriptions ready at port ${process.env.PORT}${gqlServer.subscriptionsPath}`
  );
});
