const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const MongoClient = require("mongodb").MongoClient;
require("dotenv").config();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mypty.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(express.static("serviceImage"));
app.use(fileUpload());

const port = 5000;

app.get("/", (req, res) => {
    res.send("Hello World!");
});

const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
client.connect((err) => {
    const serviceCollection = client
        .db("creativeAgency")
        .collection("services");

    app.post("/addAService", (req, res) => {
        const image = req.files.image;
        const title = req.body.title;
        const description = req.body.description;
        image.mv(`${__dirname}/serviceImage/${image.name}`, (err) => {
            if (err) {
                console.log(err);
                return res
                    .status(500)
                    .send({ msg: "Failed to upload image in the server." });
            }
            return res.send({ name: image.name, path: `/${image.name}` });
        });
    });
});

app.listen(process.env.PORT || port);
