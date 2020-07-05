import Queue from "bull";
import dotenv from "dotenv";
dotenv.config();

const emailQueue = new Queue("email", process.env.REDIS_URL);

export default emailQueue;
