import app from "@/routes.ts";

export function start() {
    Deno.serve(app.fetch);
}