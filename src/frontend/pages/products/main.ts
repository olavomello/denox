import type { Context } from "hono";

export const config = {
    layout: "default"
};

export default async function(c: Context) {
    return  `
                <h1>My Products</h1>
                <p>This page uses the default layout.</p>
            `;

}