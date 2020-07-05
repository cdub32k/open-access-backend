import Queue from "bull";
import dotenv from "dotenv";
dotenv.config();

const deleteUserQueue = new Queue("deleteUser", process.env.REDIS_URL);

export default deleteUserQueue;
