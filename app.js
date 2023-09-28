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

const validatePassword = (password) => {
  return password.length > 4;
};
app.post("/register", async (request, response) => {
  const { username, name, password, gender } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);

  if (databaseUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      user (username, name, password, gender)
     VALUES
      (
       '${username}', 
       '${name}',
       '${hashedPassword}',
       '${gender}'
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

const convertUserTweetDbObjectToResponseObject = (dbObject) => {
  return {
    username: dbObject.username,
    tweet: dbObject.tweet,
    dateTime: dbObject.date_time,
  };
};

app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const getTweetFeedQuery = `
    SELECT
      *
    FROM
      user
    NATURAL JOIN 
       tweet
    ORDER BY 
    "LIMIT 4 OFFSET 4";`;
  const UserTweetArray = await database.all(getTweetFeedQuery);
  response.send(
    UserTweetArray.map((eachTweet) =>
      convertUserTweetDbObjectToResponseObject(eachTweet)
    )
  );
});

const convertTweetUserDbObjectToResponseObject = (dbObject) => {
  return {
    name: dbObject.name,
  };
};

app.get("/user/following/", authenticateToken, async (request, response) => {
  const getUserFollowQuery = `
    SELECT 
      *
    FROM 
      user 
    NATURAL JOIN 
    follower;`;
  const tweetName = await database.all(getUserFollowQuery);
  response.send(
    tweetName.map((names) => convertTweetUserDbObjectToResponseObject(names))
  );
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
  const tweetFollower = await database.get(getTweetQuery);
  response.send(
    tweetFollower.map((eachFollower) =>
      convertUserTweetDbObjectToResponseObject(eachFollower)
    )
  );
});

const convertTweetLikesDbObjectToResponseObject = (dbObject) => {
  return {
    like: dbObject.name,
  };
};

app.get(
  "/tweets/:tweetId/likes/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const getTweetQuery = `
    SELECT
      *
    FROM
     tweet
    NATURAL JOIN
     likes
    WHERE
      tweet_id = ${tweetId};`;
    const tweetLikes = await database.get(getTweetQuery);
    if (res !== undefined) {
      response.send(
        tweetLikes.map((eachLike) =>
          convertTweetLikesDbObjectToResponseObject(eachLike)
        )
      );
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

const convertTweetReplytDbObjectToResponseObject = (dbObject) => {
  return {
    replies: [
      {
        name: dbObject.name,
        reply: dbObject.reply,
      },
    ],
  };
};

app.get(
  "/tweets/:tweetId/replies/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const getTweetReplyQuery = `
    SELECT
      *
    FROM
     user
    NATURAL JOIN reply
    WHERE
      tweet_id = ${tweetId};`;
    const tweetReply = await database.get(getTweetReplyQuery);
    if (tweetReply === undefined) {
      response.status(401);
      response.send("Inavlid Request");
    } else {
      response.send(
        tweetReply.map((eachReply) =>
          convertTweetReplytDbObjectToResponseObject(eachReply)
        )
      );
    }
  }
);

const convertTweetUsersDbObjectToResponseObject = (dbObject) => {
  return {
    tweet: dbObject.tweet,
    likes: dbObject.like_id,
    replies: dbObject.replies_id,
    dateTime: dbOject.date_time,
  };
};

app.post("/user/tweets/", authenticateToken, async (request, response) => {
  const { tweet } = request.body;
  const getUserTweetsQuery = `
   INSERT INTO 
      tweet(tweet)
    VALUES 
    (${tweet});`;
  const userTweet = await database.get(getUserTweetQuery);
  response.send("Created a Tweet");
});

app.get("/user/tweets/", authenticateToken, async (request, response) => {
  const { tweetId } = request.params;
  const getUserTweetQuery = `
    SELECT
      *
    FROM
     user;`;
  const userTweet = await database.get(getUserTweetQuery);
  response.send(
    userTweet.map((eachTweet) =>
      convertTweetUsersDbObjectToResponseObject(eachTweet)
    )
  );
});

app.get("/tweets/:tweetId/", authenticateToken, async (request, response) => {
  const { tweetId } = request.params;
  const getTweetQuery = `
     SELECT * FROM tweet WHERE tweet_id = ${tweetId};`;
  const tweetArray = await database.run(getTweetQuery);
  if (result === undefined) {
    response.send(
      tweetArray.map((eachTweet) =>
        convertTweetUsersDbObjectToResponseObject(eachTweet)
      )
    );
  } else {
    response.status(401);
    response.send("Invalid Request");
  }
});

app.delete(
  "/tweets/:tweetId/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const deleteDistrictQuery = `
  DELETE FROM
    tweet
  WHERE
    tweet_id = ${tweetId} 
  `;
    const data = await database.run(deleteDistrictQuery);
    if (data === undefined) {
      response.send("Tweet Removed");
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

module.exports = app;
