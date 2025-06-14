const fs = require("fs");

function readDatabase() {
  try {
    const data = fs.readFileSync("./db.json", "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database:", error);
    return { users: [] }; // Return an empty users array if the file doesn't exist or is invalid
  }
}

const db = readDatabase();

function updateDatabase() {
  try {
    fs.writeFileSync("./db.json", JSON.stringify(db, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing to database:", error);
  }
}

module.exports = {
  db,
  updateDatabase,
};
