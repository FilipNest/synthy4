const http = require("http");
const fs = require("fs");
const crypto = require("crypto");

const port = 3000;

const users = {};

const gridSize = 12;

const maxGrid = gridSize * gridSize;

// Function to place a user in a grid square

const placeUser = (user, location) => {
    // Don't allow user to be placed off-grid

    if (location > maxGrid) {
        return false;
    }

    // Check if a user already occupies that grid

    let occupied = Object.values(users).some(u => u.location === location);

    if (!occupied) {
        user.location = location;
        return true;
    }
};

function parseCookies(request) {
    var list = {},
        rc = request.headers.cookie;

    rc &&
        rc.split(";").forEach(function(cookie) {
            var parts = cookie.split("=");
            list[parts.shift().trim()] = decodeURI(parts.join("="));
        });

    return list;
}

const server = http.createServer((req, res) => {
    // Get cookies to determine if session

    let cookies = parseCookies(req);
    let user;

    if (!cookies["grid-user"]) {
        const id = crypto.randomBytes(16).toString("hex");

        res.setHeader("Set-Cookie", "grid-user=" + id);

        user = id;
    } else {
        user = cookies["grid-user"];
    }

    // Check if user is in user list and add them if they are not

    if (!users[user]) {
        // Check if the maximum number of users has been reached

        if (Object.keys(users).length >= maxGrid) {
            res.statusCode = 529;
            res.end("Grid is full, try again later");
            return false;
        }

        users[user] = {
            id: user,
            note: 0,
            beat: [0, 2, 4, 6]
        };

        // Get first available location

        for (let i = 0; i <= maxGrid; i += 1) {
            if (placeUser(users[user], i)) {
                break;
            }
        }
    }

    // Pop inactivity back to 0

    users[user].inactive = 0;

    // route for getting grid status

    if (req.url === "/status") {
        res.setHeader("Content-Type", "application/json");

        res.end(JSON.stringify({ users: users, you: user }));
    } else if (req.url === "/") {
        let index = fs.readFileSync("index.html", "utf8");

        res.setHeader("Content-Type", "text/html");

        res.end(index);
    } else if (req.url.indexOf("/static") !== -1) {
        let file = fs.readFileSync(__dirname + req.url, "utf8");

        res.end(file);
    } else if (req.url.indexOf("/move") !== -1) {
        let position = req.url.split("?")[1];

        if (placeUser(users[user], position)) {
            res.end(JSON.stringify(true));
        } else {
            // Position not available

            res.statusCode = 400;
            res.end(JSON.stringify(false));
        }
    } else if (req.url.indexOf("/note") !== -1) {
        let note = parseInt(req.url.split("?")[1]);

        // Check if note in range

        if (note >= 0 && note <= 12) {
            users[user].note = note;
        }
    } else if (req.url.indexOf("/beatIn") !== -1) {
        let beat = parseInt(req.url.split("?")[1]);

        console.log("beatIn", beat);

        // Check if beat in range

        if (beat >= 0 && beat <= 7) {
            users[user].beat.push(beat);
        }
    } else if (req.url.indexOf("/beatOut") !== -1) {
        let beat = parseInt(req.url.split("?")[1]);

        // Check if note in range

        if (beat >= 0 && beat <= 7) {
            users[user].beat = users[user].beat.filter((b) => b !== beat);
        }

    } else {
        res.statusCode = 404;
        res.end("404");
    }
});

// Periodically check for inactivity to remove users

setInterval(() => {
    for (let userID in users) {
        let userObject = users[userID];

        userObject.inactive += 1;

        if (userObject.inactive > 10) {
            delete users[userID];
        }
    }
}, 1000);

server.listen(port, () => {
    console.log(`Server running on ${port}/`);
});