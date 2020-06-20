import dotenv from "dotenv";
dotenv.config();

import DB from "../database";

(async () => {
  await DB.User.deleteMany({});
  Promise.all([
    DB.User.create({
      username: "first_member",
      email: "member@mail.com",
      passwordHash:
        "$2a$08$zQYLLxdHQdvhQKrC8drmIue.OzyopZwZd8x.KulGqWqj8ma1IaZPq",
    }),
    DB.User.create({
      username: "member2",
      email: "member2@mail.com",
      passwordHash:
        "$2a$08$zQYLLxdHQdvhQKrC8drmIue.OzyopZwZd8x.KulGqWqj8ma1IaZPq",
    }),
    DB.User.create({
      username: "member3",
      email: "member3@mail.com",
      passwordHash:
        "$2a$08$zQYLLxdHQdvhQKrC8drmIue.OzyopZwZd8x.KulGqWqj8ma1IaZPq",
    }),
    DB.User.create({
      username: "member4",
      email: "member4@mail.com",
      passwordHash:
        "$2a$08$zQYLLxdHQdvhQKrC8drmIue.OzyopZwZd8x.KulGqWqj8ma1IaZPq",
    }),
    DB.User.create({
      username: "member5",
      email: "member5@mail.com",
      passwordHash:
        "$2a$08$zQYLLxdHQdvhQKrC8drmIue.OzyopZwZd8x.KulGqWqj8ma1IaZPq",
    }),
    DB.User.create({
      username: "member6",
      email: "member6@mail.com",
      passwordHash:
        "$2a$08$zQYLLxdHQdvhQKrC8drmIue.OzyopZwZd8x.KulGqWqj8ma1IaZPq",
    }),
    DB.User.create({
      username: "member7",
      email: "member7@mail.com",
      passwordHash:
        "$2a$08$zQYLLxdHQdvhQKrC8drmIue.OzyopZwZd8x.KulGqWqj8ma1IaZPq",
    }),
    DB.User.create({
      username: "member8",
      email: "member8@mail.com",
      passwordHash:
        "$2a$08$zQYLLxdHQdvhQKrC8drmIue.OzyopZwZd8x.KulGqWqj8ma1IaZPq",
    }),
    DB.User.create({
      username: "member9",
      email: "member9@mail.com",
      passwordHash:
        "$2a$08$zQYLLxdHQdvhQKrC8drmIue.OzyopZwZd8x.KulGqWqj8ma1IaZPq",
    }),
    DB.User.create({
      username: "member0",
      email: "member0@mail.com",
      passwordHash:
        "$2a$08$zQYLLxdHQdvhQKrC8drmIue.OzyopZwZd8x.KulGqWqj8ma1IaZPq",
    }),
  ]).then(DB.disconnect);
})();
