require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 3000;

// middle ware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ays7mdq.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Movie master is running");
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("movie-master");
    const movieCollections = db.collection("all-movies");

    // get all movies
    app.get("/all-movies", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query.addedBy = email;
      }
      console.log(query);
      console.log(email);
      const result = await movieCollections.find(query).toArray();
      res.send(result);
    });

    // add a specific movie details
    app.get("/all-movies/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const cursor = await movieCollections.findOne(query);
      res.send(cursor);
    });

    // Add a new movie
    app.post("/all-movies", async (req, res) => {
      const newMovie = req.body;
      try {
        const result = await movieCollections.insertOne(newMovie);
        res.status(201).send({
          message: "Movie added successfully",
          movieId: result.insertedId,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to add movie", error });
      }
    });

    // update movie
    app.patch("/all-movies/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: updatedData };
      const result = await movieCollections.updateOne(filter, updateDoc);
      res.send(result);
    });

    // delete a movie
    app.delete("/all-movies/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await movieCollections.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Movie Master is listening on port ${port}`);
});
