const http = require("http");
const fs = require("fs");
const crypto = require("crypto");

const port = 3000;

const users = {};

const gridSize = 12;

// Build matrix (sorry)

let grid = [];

for (let row = 0; row <= gridSize; row += 1) {

    grid.push(Array.from(new Array(gridSize)).fill(null));

}

// Function for checking if a point is within the grid bounds

let inGrid = (row, column) => {

    return !(typeof grid[row] === "undefined" || typeof grid[row][column] === "undefined");

}

// Find all occupied locations touching the specified one
let getAdjacent = (row, column) => {

    let adjacentOccupied = new Set();

    // Do this the long way but I'm sure there's a better algorithm

    let lookup = [];

    // Populate lookup array with possible locations

    lookup.push(
        [row - 1, column], [row + 1, column], [row, column - 1], [row, column + 1], [row - 1, column - 1], [row + 1, column + 1], [row - 1, column + 1], [row + 1, column - 1]
    );

    // Add self

    lookup.push([row, column]);

    lookup.forEach((coords) => {

        let row = coords[0];
        let column = coords[1];

        if (!inGrid(row, column)) {

            return;

        }

        // Check if occupied

        if (grid[row][column]) {

            adjacentOccupied.add(grid[row][column]);

        }

    })

    return adjacentOccupied;

}

// Get all connected users

let getAllConnected = (row, column) => {

    // keep log of checked middle areas so as not to loop forever
    // Store as strings for easy checking

    let checked = new Set();
    let allConnected = new Set();

    let connected = (row, column) => {

        let adjacentOccupied = Array.from(getAdjacent(row, column));

        // Filter to see if already checked
        let toCheck = adjacentOccupied.filter((i) => {

            let stringKey = JSON.stringify(i.location);

            return !checked.has(stringKey);

        });

        let merged = new Set([...allConnected, ...toCheck]);

        allConnected = merged;

        toCheck.forEach((i) => {

            checked.add(JSON.stringify(i.location));

            connected(i.location[0], i.location[1]);

        });

    };

    connected(row, column);

    return allConnected;

}


const maxGrid = gridSize * gridSize;

// Function to place a user in a grid square

const placeUser = (user, row, column) => {

    // Abort if location is off grid

    if (!inGrid(row, column)) {

        return false;

    } else {

        location = grid[row][column];

    }

    // Check if a user already occupies that location

    if (location !== null) {

        return false;

    } else {

        user.location = [row, column]
        grid[row][column] = user;
        return true;

    }

};

// Quick function to parse cookies (StackOverflow #3393854)

let parseCookies = (request) => {
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

    let user = parseCookies(req)["grid-user"];

    if (!user) {

        const id = crypto.randomBytes(16).toString("hex");

        res.setHeader("Set-Cookie", "grid-user=" + id);

        user = id;
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
            // beat: new Set([0, 2, 4, 6])
            beat: new Set([0])
        };

        // Get first available location

        for (let row = 0; row <= gridSize; row += 1) {

            let empty = grid[row].findIndex((l) => l === null);

            if (empty !== -1) {

                grid[row][empty] = users[user];
                users[user].location = [row, empty];
                break;

            }

        }

    }

    // Pop inactivity back to 0

    users[user].inactive = 0;

    // route for getting grid status

    if (req.url === "/status") {

        res.setHeader("Content-Type", "application/json");

        // Get linked occupied places

        let linked = getAllConnected(users[user].location[0], users[user].location[1]);

        let output = JSON.stringify({ users: users, you: user, linked: linked }, (key, value) => {

            if (value instanceof Set) {

                return Array.from(value)

            }

            return value;

        })

        res.end(output);

    } else if (req.url === "/") {
        let index = fs.readFileSync("index.html", "utf8");

        res.setHeader("Content-Type", "text/html");

        res.end(index);
    } else if (req.url.indexOf("/static") !== -1) {
        let file = fs.readFileSync(__dirname + req.url, "utf8");

        res.end(file);
    } else if (req.url.indexOf("/move") !== -1) {

        let previousRow = users[user].location[0];
        let previousColumn = users[user].location[1];

        let position = req.url.split("?")[1];

        if (!position) {

            return false;

        }

        let coords = position.split("-");

        let row = parseInt(coords[0]);
        let column = parseInt(coords[1]);

        if (placeUser(users[user], row, column)) {

            // Clear previous location

            grid[previousRow][previousColumn] = null;

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

        // Check if beat in range

        if (beat >= 0 && beat <= 7) {
            users[user].beat.add(beat);
        }

    } else if (req.url.indexOf("/beatOut") !== -1) {
        let beat = parseInt(req.url.split("?")[1]);

        // Check if note in range

        if (beat >= 0 && beat <= 7) {
            users[user].beat.delete(beat);
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
            // Remove from grid and delete user
            grid[userObject.location[0]][userObject.location[1]] = null;
            delete users[userID];
        }
    }
}, 1000);

server.listen(port, () => {
    console.log(`Server running on ${port}/`);
});