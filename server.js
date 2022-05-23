/*
netstat -ano | findstr "8080"
taskkill /PID PORT_NUMBER /f
*/
require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const app = express();
const { Client } = require("pg");
const bp = require("body-parser");
const PORT = 8080;

app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));

app.use(express.static("public")); // anything in public can be send in here

/* Azure
const db = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: 5432,
    ssl: true
})
*/

const db = new Client({
  host: "localhost",
  user: "postgres",
  database: "web_movie_database",
  password: "haekal",
  port: 5432,
});

// session middleware
const oneDay = 1000 * 60 * 60 * 24;
app.use(
  session({
    secret: "this is a secret",
    saveUninitialized: true,
    cookie: { maxAge: oneDay },
    resave: false,
  })
);

app.get("/", (req, res) => {
  // if user is not logged in then send it to the login page
  if (!req.session.userid) res.redirect("../login.html");
  else res.redirect("../search.html");
});

app.get("/api/get_session", (req, res) => {
  res.send(req.session);
});

app.post("/api/authenticate", (req, res) => {
    const { username, password } = req.body;
    /*
    const query = `SELECT password FROM users WHERE username = '${username};'`;
   
    db.query(query, (err, results) => {
        if (err){
            console.log(err);
            alert('Login failed');
            return;
        }
        try {
            // if successful, redirect to search.html
            if(await bcrypt.compare(password, results.rows)) {
                let user_session = req.session;
                user_session.userid = username;
                console.log(`Login as ${user_session.userid}`);
                res.redirect("../search.html")
            } else{
                res.send("Invalid username or password");            
            }
        }
        catch {
            res.status(500).send();
        }
    });
    */

    // hanya untuk testing
    if (username == 'user1' && password == 'user1'){
        let user_session = req.session;
        user_session.userid = username;
        res.redirect("../search.html")
    } else if (username == 'admin' && password == 'admin'){
        let user_session = req.session;
        user_session.userid = username;
        res.redirect("../admin.html")
    }
    else {
        res.send('Invalid username or password');
    }
});

/* gw comment dulu soalnya masih ada error
app.post("/api/register", (req, res) => {
    // Belum bikin jika username sama kayak di database 
    try{
        const hashedPassword = await bycrpt.hash(req.body.password, 10);
        const username = req.body.username;
        db.query(
            "INSERT INTO users (username, password) VALUES ($1, $2)",
            [username, hashedPassword],
            (err) => {
              if (err) {
                console.log(err);
                return;
              }
              res.send("Register Successful");
            }
          );

    } catch{
        res.status(500).send();
    }
});
*/

app.get("/api/logout", (req, res) => {
  req.session.destroy();
  res.redirect("../login.html");
});

app.post('/api/search_from_user', (req, res) => {
    const { title, username } = req.body

    const query = 
    `SELECT 
        m.title, 
        TO_CHAR(m.release_date, 'dd Month yyyy'), 
        m.runtime, 
        g.genre_name, 
        CASE
            WHEN u.round IS NOT NULL THEN CONCAT(u.round, '/10 (', v.count, ')')
            ELSE NULL
        END AS wmd_rating,
        r.user_rating,
        s.status
    FROM 
        movies AS m 
    INNER JOIN 
        genres AS g 
        ON m.genre_id = g.genre_id 
    LEFT JOIN 
        (SELECT movie_id, ROUND(AVG(user_rating), 2) FROM users_ratings GROUP BY movie_id) AS u
        ON u.movie_id = m.movie_id
    LEFT JOIN 
        (SELECT * FROM users_ratings WHERE username = '${username}') AS r
        ON r.movie_id = m.movie_id
    LEFT JOIN
        (SELECT movie_id, COUNT(movie_id) FROM users_ratings GROUP BY movie_id) AS v
        ON v.movie_id = m.movie_id
    LEFT JOIN
        (SELECT * FROM users_mov_statuses WHERE username = '${username}') AS s 
        ON s.movie_id = m.movie_id
    WHERE lower(m.title) SIMILAR TO '(${title}%|%${title}%|%${title})';` // at the start, middle or end

    db.query(query, (err, results) => {
        if (err) {
            console.log(err);
            return;
        }
        console.log(results.rows)
        res.status(200).send(results.rows);
    });
})

app.post('/api/search_from_admin', (req, res) => {
    const { title } = req.body

    const query = 
    `SELECT 
        m.movie_id,
        m.title, 
        TO_CHAR(m.release_date, 'dd Month yyyy'), 
        m.runtime, 
        g.genre_name, 
        CASE
            WHEN u.round IS NOT NULL THEN CONCAT(u.round, ' /10 (', v.count, ')')
            ELSE NULL
        END AS wmd_rating
    FROM 
        movies AS m 
    INNER JOIN 
        genres AS g 
        ON m.genre_id = g.genre_id 
    LEFT JOIN 
        (SELECT movie_id, ROUND(AVG(user_rating), 2) FROM users_ratings GROUP BY movie_id) AS u
        ON u.movie_id = m.movie_id
    LEFT JOIN
        (SELECT movie_id, COUNT(movie_id) FROM users_ratings GROUP BY movie_id) AS v
        ON v.movie_id = m.movie_id
    WHERE lower(m.title) SIMILAR TO '(${title}%|%${title}%|%${title})';` // at the start, middle or end

  db.query(query, (err, results) => {
    if (err) {
      console.log(err);
      return;
    }
    console.log(results.rows);
    res.status(200).send(results.rows);
  });
});

db.connect((err) => {
  if (err) {
    console.log(err);
    return;
  }
  console.log(`Connected to ${process.env.DB_DATABASE}`);
});

app.listen(8080, () => {
  console.log(`Server is running on port ${PORT}`);
});
