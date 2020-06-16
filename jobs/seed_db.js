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
  ]).then(DB.disconnect);
})();
