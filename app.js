const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const databasePath = path.join(__dirname, "twitterClone.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

function authenticateToken(request, response, next) {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
}

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);

  if (databaseUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      user (username, name, password, gender, location)
     VALUES
      (
       '${username}',
       '${name}',
       '${hashedPassword}',
       '${gender}',
       '${location}'  
      );`;
    if (validatePassword(password)) {
      await database.run(createUserQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);
  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const getStatesQuery = `
    SELECT
      *
    FROM
      user;`;
  const UserArray = await database.all(getStatesQuery);
  response.send(UserArray);
});

app.get("/user/following/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT 
      *
    FROM 
      user ;`;
  const tweet = await database.get(getStateQuery);
  response.send(tweet);
});

app.get("/user/followers/", authenticateToken, async (request, response) => {
  const { tweetId } = request.params;
  const getTweetsQuery = `
    SELECT
      *
    FROM
     user
    WHERE
      tweet_id = ${tweetId};`;
  const tweetQuery = await database.get(getTweetQuery);
  response.send(tweetQuery);
});

app.get(
  "/tweets/:tweetId/likes/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const getDistrictsQuery = `
    SELECT
      *
    FROM
     tweet
    WHERE
      tweet_id = ${tweetId};`;
    const district = await database.get(getDistrictsQuery);
    response.send(convertDistrictDbObjectToResponseObject(district));
  }
);

app.get(
  "/tweets/:tweetId/replies/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const getDistrictsQuery = `
    SELECT
      *
    FROM
     user
    NATURAL JOIN reply
    WHERE
      tweet_id = ${tweetId};`;
    const district = await database.get(getDistrictsQuery);
    response.send(convertDistrictDbObjectToResponseObject(district));
  }
);

app.post("/user/tweets/", authenticateToken, async (request, response) => {
  const { tweetId } = request.params;
  const getDistrictsQuery = `
    SELECT
      *
    FROM
     user
    WHERE
     tweet_id = ${tweetId};`;
  const district = await database.get(getDistrictsQuery);
  response.send(convertDistrictDbObjectToResponseObject(district));
});

app.get("/user/tweets/", authenticateToken, async (request, response) => {
  const { tweetId } = request.params;
  const getDistrictsQuery = `
    SELECT
      *
    FROM
     district
    WHERE
      tweet_id = ${tweetId};`;
  const district = await database.get(getDistrictsQuery);
  response.send(convertDistrictDbObjectToResponseObject(district));
});

app.get("/tweets/:tweetId/", authenticateToken, async (request, response) => {
  const { tweetId } = request.params;
  const postDistrictQuery = `
  INSERT INTO
    tweet (tweet)
  VALUES
    (${tweetId};`;
  await database.run(postDistrictQuery);
  response.send("Tweet Successfully Added");
});

app.delete(
  "/tweets/:tweetId/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const deleteDistrictQuery = `
  DELETE FROM
    district
  WHERE
    tweet_id = ${tweetId} 
  `;
    await database.run(deleteDistrictQuery);
    response.send("Tweet Removed");
  }
);

module.exports = app;
