import { mkdirSync, existsSync, copyFileSync } from "fs";
import path from "path";

function main() {
  const src = path.join(__dirname, "..", "artifacts", "contracts", "Voting.sol", "Voting.json");
  const destDir = path.join(__dirname, "..", "frontend", "src", "contracts");
  const dest = path.join(destDir, "Voting.json");

  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  copyFileSync(src, dest);
  console.log("Copied ABI to:", dest);
}

main();