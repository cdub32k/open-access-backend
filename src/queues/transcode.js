import Queue from "bull";
import dotenv from "dotenv";
dotenv.config();

const transcodeQueue = new Queue("transcode", process.env.REDIS_URL);

export default transcodeQueue;
