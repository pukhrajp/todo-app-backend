const express = require("express");
const { v4 } = require("uuid");
const bodyParser = require("body-parser");
const cors = require("cors");
const { db, updateDatabase } = require("./lib/db");

const app = express();
app.use(cors());
app.use(bodyParser.json());
/**
 * C - Create POST
 * R - Read GET
 * U - Update PUT/PATCH
 * D - Delete DELETE
 */

app.get("/", (req, res) => {
  console.log(req);
  res.send("Welcome to the Todo App Backend!");
});

app.get("/users", (req, res) => {
  const { users } = db;
  const usersWithoutPassword = users.map(({ password, ...rest }) => rest); // Exclude password from the response
  res.send(usersWithoutPassword);
});

app.post("/users", (req, res) => {
  const { name, email, password } = req.body;
  const user = db.users.find((u) => u.email === email);
  if (user) {
    return res.status(400).send("User already exists with this email address");
  }
  const newUser = {
    id: v4(),
    name,
    email,
    password,
    isEmailVerified: false,
  };
  db.users.push(newUser);

  updateDatabase();
  const { password: p, ...restUser } = newUser; // Exclude password from the response
  res.send({
    message: "User created successfully",
    user: restUser,
  });
});

app.listen(8000, () => {
  console.log("Server is running on port 8000");
});
