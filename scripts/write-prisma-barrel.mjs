/**
 * Prisma 7 client output has no package root `index.ts`; imports use `@/generated/prisma`.
 * Match Dockerfile: re-export client, enums, and models.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "src", "generated", "prisma");
const file = join(dir, "index.ts");

mkdirSync(dir, { recursive: true });
writeFileSync(
  file,
  `export * from "./client";\nexport * from "./enums";\nexport * from "./models";\n`,
  "utf8",
);
