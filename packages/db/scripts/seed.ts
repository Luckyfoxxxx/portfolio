import { hash } from "@node-rs/argon2";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { randomBytes } from "crypto";
import * as readline from "readline";
import * as schema from "../src/schema/index.js";

const dbUrl = process.env["DATABASE_URL"] ?? "../../data/portfolio.db";

async function prompt(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  if (hidden) {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    return new Promise((resolve) => {
      let password = "";
      process.stdin.on("data", (char) => {
        const c = char.toString();
        if (c === "\r" || c === "\n") {
          process.stdin.setRawMode(false);
          rl.close();
          process.stdout.write("\n");
          resolve(password);
        } else if (c === "\u0003") {
          process.exit();
        } else if (c === "\u007f") {
          password = password.slice(0, -1);
        } else {
          password += c;
        }
      });
    });
  }
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const sqlite = new Database(dbUrl);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });

  const username = (await prompt("Username [admin]: ")) || "admin";
  const password = await prompt("Password: ", true);

  if (password.length < 12) {
    console.error("Password must be at least 12 characters");
    process.exit(1);
  }

  const passwordHash = await hash(password);
  const userId = randomBytes(16).toString("hex");

  await db.insert(schema.users).values({
    id: userId,
    username,
    passwordHash,
  });

  console.log(`User '${username}' created successfully.`);
  sqlite.close();
}

main().catch(console.error);
