import type { Context } from "hono";

export default async function layout(
  c: Context,
  content: string,
): Promise<string> {
  return `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>My Website</title>
</head>

<body>

<header>
    Header
</header>

<main>
${content}
</main>

<footer>
    Footer
</footer>

</body>

</html>
`;
}