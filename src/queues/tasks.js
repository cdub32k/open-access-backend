import Queue from "bull";
import dotenv from "dotenv";
dotenv.config();

const tasksQueue = new Queue("tasks", process.env.REDIS_URL);

export default tasksQueue;
