const express = require("express");
const cors = require("cors");
const uuid = require("uuid");
const fs = require("fs");
const bodyParser = require("body-parser");
const { db, updateDatabase } = require("./lib/db");
const { generateOtp } = require("./lib/helpers");
const { sendEmail } = require("./lib/email");
const app = express();
const port = 8000;

const { users } = db;
/**
 * * RESTful API Design
 * CRUD - Create, Read, Update, Delete
 * get (read)
 * post (create)
 * put (complete update)
 * delete (delete)
 * patch (partial update)
 */
app.use(cors());
app.use(bodyParser.json());
app.get("/", (req, res) => {
  res.send(users);
});

app.post("/verify-otp", (req, res) => {
  const token = req.headers.authorization; // Assuming the token
  if (!token) {
    return res.status(401).send("Unauthorized");
  }
  const { otp } = req.body;
  if (!otp) {
    return res.status(400).send("OTP is required");
  }

  const user = users.find((u) => {
    return u.otp == otp;
  });
  if (!user) {
    return res.status(404).send("OTP is not valid or expired");
  }

  user.isEmailVerified = true;
  updateDatabase();

  res.send({
    message: "Email verified successfully",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
    },
  });
});

app.post("/signup", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).send("All fields are required");
  }

  const existingUser = users.find((u) => u.email === email);

  if (existingUser) {
    return res.status(400).send("User already exists with this email address");
  }

  const newUser = {
    id: uuid.v4(),
    name,
    email,
    password,
    isEmailVerified: false,
  };

  if (users) {
    users.push(newUser);
  } else {
  }

  updateDatabase();

  res.status(201).send(newUser);
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send("Email and password are required");
  }

  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).send("Invalid email or password");
  }

  const token = uuid.v4();
  if (user.tokens) {
    user.tokens.push(token);
  } else {
    user.tokens = [token];
  }
  if (!user.isEmailVerified) {
    const otp = generateOtp();
    user.otp = otp; // Store OTP in the user object
    sendEmail(user.email, "Your OTP Code", `Your OTP code is: ${otp}`);
  }
  const { password: p1, tokens, otp, ...restUser } = user; // Exclude password from the response
  updateDatabase();
  res.send({ user: restUser, token });
});

app.get("/current-user", (req, res) => {
  const token = req.headers.authorization; // Assuming the token
  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  // In a real application, you would verify the token and find the user
  const user = users.find((u) => {
    if (u.tokens) {
      return u.tokens.includes(token.split(" ")[1]);
    }
    return false;
  });
  if (!user) {
    return res.status(404).send("User not found");
  }
  const { password, tokens, otp, ...restUser } = user; // Exclude password from the response
  res.send(restUser);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
