const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs-extra");
const admin = require("firebase-admin");
const fileUpload = require("express-fileupload");
const ObjectId = require("mongodb").ObjectID;
const MongoClient = require("mongodb").MongoClient;
require("dotenv").config();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mypty.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(express.static("serviceImage"));
app.use(fileUpload());

const port = 5000;

var serviceAccount = require("./config/creative-agency-42bae-firebase-adminsdk-h8pqc-6ee01bac54.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://creative-agency-42bae.firebaseio.com",
});

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
    const orderCollection = client
        .db("creativeAgency")
        .collection("clientOrder");

    app.post("/addAService", (req, res) => {
        const file = req.files.file;
        const title = req.body.title;
        const description = req.body.description;
        const filePath = `${__dirname}/serviceImage/${file.name}`;

        file.mv(filePath, (err) => {
            if (err) {
                console.log(err);
                res.status(500).send({
                    msg: "Failed to upload image in the server.",
                });
            }
            const newImg = fs.readFileSync(filePath);
            const encImg = newImg.toString("base64");

            var image = {
                contentType: req.files.file.mimetype,
                size: req.files.file.size,
                img: Buffer(encImg, "base64"),
            };
            serviceCollection
                .insertOne({ title, description, image })
                .then((res) => {
                    fs.remove(filePath, (error) => {
                        if (error) {
                            console.log(error);
                            res.status(500).send({
                                msg: "Failed to upload image in the server.",
                            });
                        }
                        res.send(result.insertedCount > 0);
                    });
                });
        });
    });

    app.get("/services", (req, res) => {
        serviceCollection.find({}).toArray((err, documents) => {
            res.send(documents);
        });
    });

    app.get("/service/:id", (req, res) => {
        serviceCollection
            .find({ _id: ObjectId(req.params.id) })
            .toArray((err, documents) => {
                res.send(documents[0]);
            });
    });

    app.post("/addOrder", (req, res) => {
        const order = req.body;
        orderCollection.insertOne(order).then((res) => {
            res.send(result.insertedCount > 0);
        });
    });

    app.get("/orderList", (req, res) => {
        const bearer = req.headers.authorization;
        if (bearer && bearer.startsWith("Bearer ")) {
            const idToken = bearer.split(" ")[1];
            admin
                .auth()
                .verifyIdToken(idToken)
                .then(function (decodedToken) {
                    let tokenEmail = decodedToken.email;
                    const queryEmail = req.query.email;
                    if (tokenEmail === queryEmail) {
                        orderCollection
                            .find({ email: queryEmail })
                            .toArray((err, documents) => {
                                res.send(documents);
                            });
                    } else {
                        res.status(401).send("un-authorized access");
                    }
                })
                .catch(function (error) {
                    res.status(401).send("un-authorized access");
                });
        } else {
            res.status(401).send("un-authorized access");
        }
    });
});

app.listen(process.env.PORT || port);
