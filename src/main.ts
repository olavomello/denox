import app from "@/routes.ts";
// Initialize the server and start listening for incoming requests
Deno.serve(app.fetch);