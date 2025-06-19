const express = require("express");
const cors = require("cors");
const uuid = require("uuid");
const bodyParser = require("body-parser");
const { db, updateDatabase } = require("./lib/db");
const { generateOtp, getUserByToken } = require("./lib/helpers");
const { sendEmail } = require("./lib/email");
const app = express();
const port = 8000;

const { users, members } = db;
/**
 * * RESTful API Design
 * CRUD - Create, Read, Update, Delete
 * get (read) - /users, /todos
 * get (read by id) - /users/:id, /todos/:id
 * post (create) - /users, /todos
 * put (complete update) /users/:id, /todos/:id
 * delete (delete) - /users/:id, /todos/:id
 * delete (multiple) - /users, /todos
 *
 * patch (partial update) - /users/:id, /todos/:id
 */
app.use(cors());
app.use(bodyParser.json());
app.get("/", (req, res) => {
  res.send(users);
});

/**
 * * Verify OTP
 * * This endpoint allows a user to verify their email using an OTP sent to their email address.
 * * It requires the user to provide the OTP in the request body.
 */
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

/**
 * * * User Signup
 * * This endpoint allows a new user to sign up by providing their name, email, and password.
 * * It checks if the user already exists and returns an error if they do.
 */
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
  const user = getUserByToken(users, req);

  if (!user) {
    return res.status(404).send("User not found");
  }
  const { password, tokens, otp, ...restUser } = user; // Exclude password from the response
  res.send(restUser);
});

/**
 * * Create a new todo
 * * This endpoint allows the authenticated user to create a new todo item.
 * * It requires the user to be authenticated via a token in the request headers.
 */
app.post("/todos", (req, res) => {
  const user = getUserByToken(users, req);

  if (!user) {
    return res.status(401).send("Unauthorized");
  }
  const { title } = req.body;
  if (!title) {
    return res.status(400).send("Title is required");
  }

  const newTodo = {
    id: uuid.v4(),
    title,
    completed: false,
    userId: user.id,
  };

  if (db.todos) {
    db.todos.push(newTodo);
  } else {
    db.todos = [newTodo];
  }

  updateDatabase();
  res.status(201).send({ todo: newTodo });
});

/**
 * * Get all todos for the current user
 * * This endpoint retrieves all todos associated with the authenticated user.
 * * It uses the token from the request headers to identify the user.
 */
app.get("/todos", (req, res) => {
  const user = getUserByToken(users, req);

  if (!user) {
    return res.status(401).send("Unauthorized");
  }

  const userTodos = db.todos.filter((todo) => todo.userId === user.id);
  res.send({ todos: userTodos });
});

app.patch("/todos/:id", (req, res) => {
  const user = getUserByToken(users, req);

  if (!user) {
    return res.status(401).send("Unauthorized");
  }
  const todoId = req.params.id;
  const { completed } = req.body;

  const todo = db.todos.find(
    (todo) => todo.id === todoId && todo.userId === user.id
  );

  if (!todo) {
    return res.status(404).send("Todo not found");
  }

  if (completed !== undefined) {
    todo.completed = completed;
  }

  updateDatabase();
  res.send({ todo });
});

app.delete("/todos/:id", (req, res) => {
  const user = getUserByToken(users, req);

  if (!user) {
    return res.status(401).send("Unauthorized");
  }
  const todoId = req.params.id;
  const todoIndex = db.todos.findIndex(
    (todo) => todo.id === todoId && todo.userId === user.id
  );

  if (todoIndex === -1) {
    return res.status(404).send("Todo not found");
  }

  db.todos.splice(todoIndex, 1);
  updateDatabase();

  res.send({ message: "Todo deleted successfully" });
});

app.post("/members", (req, res) => {
  const sender = getUserByToken(users, req);

  if (!sender) {
    return res.status(401).send("Unauthorized");
  }
  const { email } = req.body;
  const receiver = users.find((u) => u.email === email);
  if (!receiver) {
    return res.status(404).send("User not found with this email address");
  }

  const member = members.find(
    (m) => m.senderId === sender.id && m.receiverId === receiver.id
  );

  if (member) {
    return res
      .status(400)
      .send("Member already exists with status " + member.status);
  }

  const newMember = {
    id: uuid.v4(),
    senderId: sender.id,
    receiverId: receiver.id,
    status: "invited", // Default status
  };

  if (db.members) {
    db.members.push(newMember);
  } else {
    db.members = [newMember];
  }

  updateDatabase();
  res.status(201).send({ member: receiver, status: newMember.status });
});

app.get("/members", (req, res) => {
  const user = getUserByToken(users, req);
  if (!user) {
    return res.status(401).send("Unauthorized");
  }

  const userMembers = members.filter((m) => m.senderId === user.id);

  const finalMembers = members.map((m) => {
    const receiver = users.find((u) => u.id === m.receiverId);
    return { ...receiver, status: m.status };
  });

  return res.send({
    members: finalMembers,
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
