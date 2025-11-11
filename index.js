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
    // await client.connect();

    const db = client.db("movie-master");
    const movieCollections = db.collection("all-movies");
    const userCollections = db.collection("users");
    const watchListCollections = db.collection("watch-list");

    // -----------------------
    // GET all Users
    // -----------------------
    app.get("/users", async (req, res) => {
      const result = await userCollections.find().toArray();
      res.send(result);
    });

    // -----------------------
    // GET Users By Email
    // -----------------------
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollections.findOne({ email });
      res.send(user);
    });

    // -----------------------
    // Post all Users
    // -----------------------

    app.post("/users", async (req, res) => {
      try {
        const newUser = req.body;

        // Check if user already exists
        const existingUser = await userCollections.findOne({
          email: newUser.email,
        });

        if (existingUser) {
          // User exists, return a message or the existing user
          return res.status(200).send({
            message: "User already exists",
            user: existingUser,
          });
        }

        // User does not exist, insert into DB
        const result = await userCollections.insertOne(newUser);

        res.status(201).send({
          message: "User created successfully",
          user: result,
        });
      } catch (error) {
        console.error("Error adding user:", error);
        res.status(500).send({ message: "Failed to add user" });
      }
    });

    // -----------------------
    // GET all Movies
    // -----------------------
    // app.get("/movies", async (req, res) => {
    //   const result = await movieCollections.find().toArray();
    //   res.send(result);
    // });

    // GET all Movies with optional filters
    app.get("/movies", async (req, res) => {
      try {
        const { genres, minRating, maxRating } = req.query;
        let filter = {};

        // Filter by multiple genres
        if (genres) {
          // Convert comma-separated string to array
          const genresArray = genres.split(",");
          filter.genre = { $in: genresArray };
        }

        // Filter by rating range
        if (minRating || maxRating) {
          filter.rating = {};
          if (minRating) filter.rating.$gte = Number(minRating);
          if (maxRating) filter.rating.$lte = Number(maxRating);
        }

        const movies = await movieCollections.find(filter).toArray();
        res.send(movies);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch movies", error });
      }
    });

    // -----------------------
    // GET all Movie Collection for login user
    // -----------------------
    app.get("/movies/my-collection", async (req, res) => {
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

    // -----------------------
    // GET top-rated movies
    // -----------------------
    app.get("/movies/top-rated", async (req, res) => {
      const limit = parseInt(req.query.limit) || 5;
      const movies = await movieCollections
        .find()
        .sort({ rating: -1 })
        .limit(limit)
        .toArray();
      res.send(movies);
    });

    // -----------------------
    // GET recently added movies
    // -----------------------
    app.get("/movies/recent", async (req, res) => {
      const limit = parseInt(req.query.limit) || 6;
      const movies = await movieCollections
        .find()
        .sort({ _id: -1 })
        .limit(limit)
        .toArray();
      res.json(movies);
    });

    // -----------------------
    // GET statistics
    // -----------------------
    app.get("/stats", async (req, res) => {
      const totalMovies = await movieCollections.countDocuments();
      const totalUsers = await userCollections.countDocuments();

      res.send({ totalMovies, totalUsers });
    });

    // -----------------------
    // Add A Specific Movie Details
    // -----------------------
    app.get("/movies/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const cursor = await movieCollections.findOne(query);
      res.send(cursor);
    });

    // -----------------------
    // Add A New Movie
    // -----------------------
    app.post("/movies/add", async (req, res) => {
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

    // -----------------------
    // Update Movie
    // -----------------------
    app.patch("/movies/update/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: updatedData };
      const result = await movieCollections.updateOne(filter, updateDoc);
      res.send(result);
    });

    // -----------------------
    // Delete Movie
    // -----------------------
    app.delete("/movies/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await movieCollections.deleteOne(query);
      res.send(result);
    });

    // -----------------------
    // Post to whichList
    // -----------------------
    app.post("/users/watch-list", async (req, res) => {
      const { userEmail, movieId } = req.body;
      const exists = await watchListCollections.findOne({ userEmail, movieId });
      if (exists)
        return res.status(400).send({ message: "Already in watchList" });

      const result = await watchListCollections.insertOne({
        userEmail,
        movieId,
      });
      res.send(result);
    });

    // -----------------------
    // Get all watch-list
    // -----------------------
    app.get("/users/watch-list/:email", async (req, res) => {
      const email = req.params.email;
      const list = await watchListCollections
        .find({ userEmail: email })
        .toArray();
      res.send(list);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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
