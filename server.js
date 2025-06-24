const express = require("express");
const { v4 } = require("uuid");
const bodyParser = require("body-parser");
const cors = require("cors");
const { db, updateDatabase } = require("./lib/db");
const { getUserByToken1 } = require("./lib/helpers");

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

app.get("/verify-token", (req, res) => {
  const authorizationValue = req.headers.authorization; // Assuming the token is sent in the Authorization header
  const token = authorizationValue ? authorizationValue.split(" ")[1] : null; // Extract the token from the header
  if (!token) {
    return res.status(401).send("Unauthorized");
  }
  const user = db.users.find((u) => u.tokens && u.tokens.includes(token));
  if (!user) {
    return res.status(401).send("Invalid token");
  }
  const { password, tokens, ...restUser } = user; // Exclude password and tokens from the response

  res.send({
    message: "Token is valid",
    user: restUser,
  });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(
    (u) => u.email === email && u.password === password
  );
  if (!user) {
    return res.status(401).send("Invalid email or password");
  }
  const token = v4(); // Generate a random token (in a real app, use JWT or similar)
  if (user.tokens) {
    user.tokens.push(token);
  } else {
    user.tokens = [token];
  }

  updateDatabase();
  const { password: p, tokens, ...restUser } = user; // Exclude password from the response
  res.send({
    message: "Login successful",
    user: restUser,
    token,
  });
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

app.get("/send-otp", (req, res) => {
  const user = getUserByToken1(db.users, req);
  if (!user) {
    return res.status(401).send("Unauthorized");
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
  user.otp = otp; // Store OTP
  updateDatabase();
  console.log(`OTP for ${user.email}: http://localhost:8000/verify-otp/${otp}`); // In a real app, send this via email or SMS
  res.send({
    message: "OTP sent successfully",
  });
});

app.get("/verify-otp/:otp", (req, res) => {
  const { otp } = req.params;
  // const user = getUserByToken1(db.users, req);
  // if (!user) {
  //   return res.status(401).send("Unauthorized");
  // }
  const user = db.users.find((u) => u.otp === otp);
  if (!user) {
    return res.status(400).send("Invalid OTP");
  }
  user.isEmailVerified = true; // Mark email as verified
  delete user.otp; // Remove OTP after verification
  updateDatabase();
  // const { password: p, tokens, ...restUser } = user; // Exclude password from the response
  res.redirect("http://localhost:5173");
});

app.get("/todos", (req, res) => {
  const user = getUserByToken1(db.users, req);
  if (!user) {
    return res.status(401).send("Unauthorized");
  }
  const todos = db.todos.filter((todo) => todo.userId === user.id);
  res.send({ todos });
});

app.post("/todos", (req, res) => {
  const user = getUserByToken1(db.users, req);
  if (!user) {
    return res.status(401).send("Unauthorized");
  }
  const { title, completed } = req.body;
  const newTodo = {
    id: v4(),
    title,
    completed,
    userId: user.id,
  };
  db.todos.push(newTodo);
  updateDatabase();
  res.send({
    message: "Todo created successfully",
    todo: newTodo,
  });
});

app.listen(8000, () => {
  console.log("Server is running on port 8000");
});
