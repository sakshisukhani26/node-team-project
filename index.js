const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const path = require("path");
const config = require("./config.json");


const User = require("./models/User");
const Form = require("./models/Form");
const UserAnswer = require("./models/UserAnswer");

const app = express();

// Middleware
app.use(express.static("public"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.use(
  session({
    secret: "ydckyghvgjhvgudutrswyer5td74e56dfuvjl",
    resave: false,
    saveUninitialized: false,
  })
);

// Database connection
// let url = `mongodb+srv://${config.username}:${config.userpassword}@${config.dbname}.${config.userstring}.mongodb.net/${config.dbname}?retryWrites=true&w=majority&appName=Valtech`;
let url = `mongodb+srv://sakshisukhani26:sakshi2601@valtech.j2mb7h2.mongodb.net/adminDB?retryWrites=true&w=majority&appName=valtech`;


mongoose
  .connect(url)
  .then(() => console.log("Database Connected"))
  .catch((err) => console.error("Database Connection Error:", err));

// Routes

// Home Page
app.get("/", (req, res) => {
  res.render("index", { user: req.session.user, message: null });
});

// Signup
app.post("/signup", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render("index", { user: null, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    await user.save();

    req.session.user = user;

    if (user.email === "admin@gmail.com") {
      return res.redirect("/admin");
    } else {
      return res.redirect("/dashboard");
    }
  } catch (err) {
    console.error(err);
    res.render("index", { user: null, message: "Error signing up" });
  }
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.render("index", { user: null, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render("index", { user: null, message: "Invalid credentials" });
    }

    req.session.user = user;

    if (user.email === "admin@gmail.com") {
      return res.redirect("/admin");
    } else {
      return res.redirect("/dashboard");
    }
  } catch (err) {
    console.error(err);
    res.render("index", { user: null, message: "Login error" });
  }
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// Dashboard
app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/");

  if (req.session.user.email === "admin@gmail.com") {
    return res.redirect("/admin");
  }

  res.render("dashboard", { user: req.session.user });
});

// Fetch All Forms
app.get("/api/forms", async (req, res) => {
  try {
    const forms = await Form.find();
    res.json(forms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching forms" });
  }
});

// Submit Form
app.post("/submit-form", async (req, res) => {
  const { formId, formTitle, answers } = req.body;
  const userId = req.session.user?._id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized. Please login first." });
  }

  try {
    const formSubmission = new UserAnswer({
      formId,
      userId,
      formTitle,
      answers,
    });

    await formSubmission.save();

    console.log("Form submitted successfully");
    res.status(200).json({ message: "Form submitted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error submitting form", error: err });
  }
});

// Admin Routes
app.get("/admin", (req, res) => {
  if (!req.session.user) return res.redirect("/");
  if (req.session.user.email !== "admin@gmail.com") return res.redirect("/dashboard");

  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Save Form Data
app.post("/admin/formData", async (req, res) => {
  const { formTitle, fieldCount, formData } = req.body;

  if (!formTitle || !formData || formData.length === 0) {
    return res.status(400).json({ message: "Form title or form data missing" });
  }

  try {
    const form = new Form({ formTitle, fieldCount, formData });
    const savedForm = await form.save();

    console.log("Form saved to database");
    res.status(200).json({ message: "Form saved successfully", savedForm });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error saving form", error: err });
  }
});

// Serve Form Builder Page
app.get("/form", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "formBuilder.html"));
});

// Fetch Form Data (for Admin Dashboard)
app.get("/fdata", async (req, res) => {
  try {
    const forms = await Form.find();
    res.json(forms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching forms" });
  }
});

// Delete a Form
app.delete("/dform/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const deletedForm = await Form.findByIdAndDelete(id);

    if (!deletedForm) {
      return res.status(404).json({ message: "Form not found" });
    }

    res.json({ message: "Form deleted", name: deletedForm.formTitle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting form", error: err });
  }
});

// Get all submissions for a Form
 
app.get('/responses/:formId', async (req, res) => {
  const formId = req.params.formId;
  try {
    const responses = await UserAnswer.find({ formId }).lean(); 
    const fullResponses = await Promise.all(responses.map(async (response) => {
      const user = await User.findById(response.userId).lean();
      return {
        email: user ? user.email : "Unknown Email",
        answers: response.answers
      };
    }));
    res.json(fullResponses);
  } catch (err) {
    console.error("Error while fetching responses:", err);
    res.status(500).json({ message: "Server error" });
  }
});
 

// Server Listening
const PORT = config.port || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
 