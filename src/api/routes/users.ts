import type { Hono } from "hono";
import { UserController } from "../controllers/UserController.ts";

export function registerUserRoutes(app: Hono) {
    app.get("/users", UserController.index);
    app.post("/users", UserController.store);
}