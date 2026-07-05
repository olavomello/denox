import { Hono } from "hono";
import { loadPages } from "./loader.ts";

const app = new Hono();

loadPages(app);

export default app;