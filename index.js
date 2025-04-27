const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const config = require("./config.json");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const User = require("./models/User");
const path = require("path");
const { error } = require("console");
const { type } = require("os");

const app = express();

app.use(express.static("public"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// let url = `mongodb+srv://${config.username}:${config.userpassword}@${config.dbname}.${config.userstring}.mongodb.net/${config.dbname}?retryWrites=true&w=majority&appName=Valtech`;
// let url = `mongodb+srv://sakshisukhani26:sakshi2601@valtech.j2mb7h2.mongodb.net/adminDB?retryWrites=true&w=majority&appName=valtech`;

let url = `mongodb+srv://aesha:valtechdb@valtechpracticedb.zhyompe.mongodb.net/formDB?retryWrites=true&w=majority&appName=valtechpracticedb`;



mongoose
  .connect(url)
  .then(() => console.log("DB Connected"))
  .catch((error) => console.log("Error", error));

let PORT = config.port;

app.use(
  session({
    secret: "your_secret_key_here",
    resave: false,
    saveUninitialized: false,
  })
);

let Schema = mongoose.Schema;

const FormFieldSchema = new Schema({
  question: { type: String, required: false },
  type: { type: String, required: false },
  name: { type: String, required: false },
  id: { type: String, required: false },
  placeholder: { type: String, required: false },
  validation: { type: String, required: false },
  options: { type: [String], default: [] },
});

const FormSchema = new Schema({
  formTitle: { type: String, required: true },
  fieldCount: { type: Number, required: true },
  formData: [FormFieldSchema],
});

const UserFormData = new Schema({
  formId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Form" },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  formTitle: { type: String, required: true },
  answers: { type: Map, of: Schema.Types.Mixed, required: true },
});

const Form = mongoose.model("Form", FormSchema);
const UserAnswer = mongoose.model("UserAnswer", UserFormData);

app.get("/", (req, res) => {
  res.render("index", { user: req.session.user , message: null});
});

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
    if (req.session.user.email === "admin@gmail.com") {
      res.redirect("/admin");
    } else {
      res.redirect("/dashboard");
    }
  } catch (err) {
    console.error(err);
    res.render("index", { user: null, message: "Error signing up" });
  }
});

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
    if (req.session.user.email === "admin@gmail.com") {
      res.redirect("/admin");
    } else {
      res.redirect("/dashboard");
    }
  } catch (err) {
    console.error(err);
    res.render("index", { user: null, message: "Login error" });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/");
  if (req.session.user.email === "admin@gmail.com") {
    res.redirect("/admin");
  } else {
    res.render("dashboard", { user: req.session.user });
  }
});

app.get("/api/forms", async (req, res) => {
  try {
    const allForms = await Form.find();
    res.json(allForms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching forms" });
  }
});

app.post("/submit-form", async (req, res) => {
  const { formId, formTitle, answers } = req.body;
  const userId = req.session.user?._id || null;

  const formSubmission = new UserAnswer({
    formId: formId,
    userId: userId,
    formTitle: formTitle,
    answers: answers,
  });

  formSubmission
    .save()
    .then((result) => {
      console.log("Form submiited");
      res.status(200).json({ message: "Form submitted successfully" });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({ message: "Error submitting form", error });
    });
});


// admin section
app.get("/admin", (req, res) => {
  if (!req.session.user) return res.redirect("/");
  if (req.session.user.email !== "admin@gmail.com")
    return res.redirect("/dashboard");
  res.sendFile(path.join(__dirname, "/public", "/admin.html"));
});

app.post("/admin/formData", (req, res) => {
  console.log("Received form data:", req.body);

  const { formTitle, fieldCount, formData } = req.body;

  if (!formTitle || !formData || formData.length === 0) {
    return res.status(400).json({ message: "Form title or data is missing" });
  }

  const form = new Form({
    formTitle: formTitle,
    fieldCount: fieldCount,
    formData: formData,
  });

  form
    .save()
    .then((result) => {
      console.log("Form data saved to MongoDB:", result);
      res.status(200).json({ message: "Form data saved successfully", result });
    })
    .catch((error) => {
      console.error("Error saving data to MongoDB:", error);
      res.status(500).json({ message: "Error saving data", error });
    });
});

app.get("/form", (req, res) => {
  res.sendFile(__dirname + "/public/formBuilder.html");
});

app.get('/fdata',(req,res) => {
  Form.find()
  .then((dbRes) => {
      res.json(dbRes)
  })
  .catch((error) => console.log("Error"+error));
});

app.delete("/dform/:id", (req,res) => {
  const {id} = req.params;
  console.log("uid",id);
  
  Form.findByIdAndDelete(id)
  .then((dbres) => {
      res.send({message: "form was deleted", name: dbres.formTitle});
  })
  .catch((error) => console.log("Error",error));
});


app.get('/responses/:formId', async (req, res) => {
  try {
      const formId = req.params.formId;
      console.log("Getting responses for form:", formId);
      const submissions = await UserAnswer.find({ formId: formId });

      res.json(submissions);
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server Error" });
  }
});



app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
