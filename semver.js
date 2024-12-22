const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const readline = require("readline");

// Path to your changelog and package.json
const changelogPath = path.join(__dirname, "CHANGELOG.md");
const packageJsonPath = path.join(__dirname, "package.json");

function incrementVersion(version) {
  const parts = version.split(".");
  const patch = parseInt(parts[2], 10) + 1; // Increment the patch version
  parts[2] = patch.toString();
  return parts.join(".");
}

function prependToChangelog(version, changelog) {
  const currentDate = new Date().toISOString().split("T")[0]; // Get current date in YYYY-MM-DD format
  const changelogEntry = `## ${version} - ${currentDate}\n\n- ${changelog}\n\n`;

  // Read existing changelog
  const changelogContent = fs.existsSync(changelogPath)
    ? fs.readFileSync(changelogPath, "utf8")
    : "";

  // Prepend the new changelog entry
  const updatedChangelog = changelogEntry + changelogContent;

  // Write the updated changelog back to the file
  fs.writeFileSync(changelogPath, updatedChangelog, "utf8");
}

function updateVersionInPackageJson() {
  const packageJson = require(packageJsonPath);
  const newVersion = incrementVersion(packageJson.version);

  // Update the version in package.json
  packageJson.version = newVersion;

  // Write the updated package.json back to the file
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + "\n",
    "utf8"
  );

  return newVersion;
}

function commitChanges(changelog) {
  try {
    // Stage all changes
    execSync("git add .", { stdio: "inherit" });

    // Commit with the provided changelog
    execSync(`git commit -m "${changelog}"`, { stdio: "inherit" });

    console.log("Changes committed successfully.");
  } catch (error) {
    console.error("Error committing changes:", error.message);
    process.exit(1);
  }
}

function updateChangelogAndVersion(changelog) {
  const newVersion = updateVersionInPackageJson();
  prependToChangelog(newVersion, changelog);

  console.log(`Version updated to ${newVersion} and changelog entry added.`);
}

async function prompt(question, defaultValue) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer || defaultValue);
    });
  });
}

async function confirm(question, defaultValue = "n") {
  const promptOptions = defaultValue === "y" ? "Y/n" : "y/N";
  const answer = await prompt(`${question} [${promptOptions}]`, defaultValue);
  return answer.toLowerCase() === "y";
}

async function promptForChangelog() {
  console.log(
    "Enter each changelog item on a new line.\nPress enter (submit a blank line) to complete."
  );
  const items = [];
  while (true) {
    const item = await prompt("\n- ");
    if (!item) {
      break;
    }
    items.push(item);
  }
  const changelog = items.map((item) => `- ${item}`).join("\n");
  return changelog;
}

async function main() {
  const changelog = await promptForChangelog();
  // updateChangelogAndVersion(changelog);

  const shouldCommit = await confirm("\nCommit changes to Git?", "y");

  if (shouldCommit) {
    commitChanges(changelog);
    console.log("Changes committed.");
  } else {
    console.log("Changes not committed.");
  }
}

main();