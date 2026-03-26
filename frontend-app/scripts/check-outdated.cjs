async function readOutdatedPackages() {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync("npm", ["outdated", "--json"], {
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && result.status !== 1) {
    const error = new Error(result.stderr || "npm outdated failed");
    error.code = result.status;
    throw error;
  }

  const json = (result.stdout || "").trim();
  return json ? JSON.parse(json) : {};
}

function printPackageList(title, packages) {
  if (packages.length === 0) {
    return;
  }

  console.log(title);
  for (const [name, info] of packages) {
    console.log(
      `- ${name}: current=${info.current}, wanted=${info.wanted}, latest=${info.latest}`,
    );
  }
  console.log("");
}

async function main() {
  const outdatedPackages = await readOutdatedPackages();
  const entries = Object.entries(outdatedPackages);

  if (entries.length === 0) {
    console.log("All dependencies are up to date.");
    return;
  }

  const needsUpdate = entries.filter(([, info]) => info.current !== info.wanted);
  const majorOnly = entries.filter(([, info]) => info.current === info.wanted);

  printPackageList("Dependencies with in-range updates (action required):", needsUpdate);
  printPackageList("Dependencies with major-only updates (informational):", majorOnly);

  if (needsUpdate.length > 0) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error.message);
  process.exitCode = typeof error.code === "number" ? error.code : 1;
});
