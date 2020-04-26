let you;

let currentBeat = 0;
let tempo = 1000;
let grid = [];

// Note mapping in sharp format

let noteMappingSharps = {
    0: "C",
    1: "C#",
    2: "D",
    3: "D#",
    4: "E",
    5: "F",
    6: "F#",
    7: "G",
    8: "G#",
    9: "A",
    10: "A#",
    11: "B"
};

let noteMappingFlats = {
    0: "C",
    1: "Db",
    2: "D",
    3: "Eb",
    4: "E",
    5: "F",
    6: "Gb",
    7: "G",
    8: "Ab",
    9: "A",
    10: "Bb",
    11: "B"
};

// Via Scriabin

let noteColours = {
    0: "#ff0000",
    1: "#cf9bff",
    2: "#ffff00",
    3: "#65659a",
    4: "#e4fbff",
    5: "#ae1600",
    6: "#00cdff",
    7: "#ff6500",
    8: "#ff00ff",
    9: "#2fcd30",
    10: "#8d8b8d",
    11: "#0000fe"
}

let frequencyMapping = {
    0: 261.63,
    1: 277.18,
    2: 293.66,
    3: 311.13,
    4: 329.63,
    5: 349.23,
    6: 369.99,
    7: 392.0,
    8: 415.3,
    9: 440.0,
    10: 466.16,
    11: 493.88
};

// Default to sharps. TODO: Switch
let mapping = noteMappingSharps;

let generateGrid = function() {

    let size = 12;

    for (let row = 0; row < size; row += 1) {

        grid.push([]);

        for (let column = 0; column < size; column += 1) {

            let box = document.createElement("div");
            box.setAttribute("class", "box");
            box.setAttribute("data-column", column);
            box.setAttribute("data-row", row);
            document.getElementById("wrapper").insertAdjacentElement("beforeend", box);

            grid[row][column] = box;

        }
    }

};

let makeRequest = url => {
    return fetch(new Request(url)).then(response => response.json());
};

let refresh = function() {

    // Store occupied locations so we can clear the rest

    let occupied = [];

    makeRequest("/status").then(data => {

        let users = data.users;

        data.linked.forEach((linked) => {

            let note = linked.note;

            linked.beat.forEach((beat) => {

                playNote(note, beat, linked.location);

            })

        });

        you = users[data.you];

        for (let user in users) {

            user = users[user];

            // Find element in lookup matrix

            let row = user.location[0];
            let column = user.location[1];

            let location = grid[row][column];

            // Clear attributes

            location.removeAttribute("data-you");

            occupied.push(location);

            location.innerHTML =
                mapping[user.note];

            if (user.id === you.id) {
                location.setAttribute("data-you", "true");
            }
        }

        // Highlight the user's selected note

        document.querySelectorAll("[data-note]").forEach(k => {
            let keyNote = parseInt(k.getAttribute("data-note"));

            if (keyNote === you.note) {
                k.setAttribute("data-selected", "true");
            } else {
                k.setAttribute("data-selected", "false");
            }
        });

        // Highlight the user's selected beats

        document.querySelectorAll("[data-beat]").forEach(b => {
            let beat = parseInt(b.getAttribute("data-beat"));

            if (you.beat.indexOf(beat) !== -1) {
                b.setAttribute("data-selected", "true");
            } else {
                b.setAttribute("data-selected", "false");
            }

        });

        // Clear all unused locations

        document.querySelectorAll(".box").forEach((e) => {

            if (occupied.indexOf(e) === -1) {

                e.removeAttribute("data-you");
                e.innerHTML = "";

            }

        })

    });
};

// Move current user to a square

let move = function(row, column) {
    makeRequest("/move?" + row + "-" + column);
};

let moveDirection = direction => {

    let yourRow = you.location[0];
    let yourColumn = you.location[1];

    let targetRow;
    let targetColumn;

    switch (direction) {
        case "up":
            targetColumn = yourColumn;
            targetRow = yourRow - 1;
            break;
        case "down":
            targetColumn = yourColumn;
            targetRow = yourRow + 1;
            break;
        case "left":
            targetRow = yourRow;
            targetColumn = yourColumn - 1;
            break;
        case "right":
            targetRow = yourRow;
            targetColumn = yourColumn + 1;
            break;
    }

    move(targetRow, targetColumn);

};

// Map arrow buttons to move directions

document.querySelectorAll(".arrow").forEach(a => {
    let direction = a.getAttribute("data-direction");

    a.addEventListener("click", () => {
        moveDirection(direction);
    });
});

// Arrow shortcuts

document.addEventListener("keydown", function(event) {
    switch (event.which) {
        case 37:
            moveDirection("left");
            break;
        case 38:
            moveDirection("up");
            break;
        case 39:
            moveDirection("right");
            break;
        case 40:
            moveDirection("down");
            break;
    }
});

// Make note change request

let note = function(noteNumber) {
    makeRequest("/note?" + noteNumber);
};

// Map note keys to notes

document.querySelectorAll("[data-note]").forEach(n => {
    let noteNumber = n.getAttribute("data-note");

    n.addEventListener("click", () => {
        note(noteNumber);
    });
});

// Map beat keys to beats

document.querySelectorAll("[data-beat]").forEach(b => {
    let beatNumber = b.getAttribute("data-beat");

    b.addEventListener("click", () => {
        let on = b.getAttribute("data-selected") === "true";
        beat(beatNumber, !on);
    });
});

// Make beat change request

let beat = function(beatNumber, on) {

    if (on) {
        makeRequest("/beatIn?" + beatNumber);
    } else {
        makeRequest("/beatOut?" + beatNumber);
    };

};

let start = () => {

    // Hide start button
    document.getElementById("start").style.display = "none";

    // Generate grid and lookup matrix

    generateGrid();

    // Tempo
    window.setInterval(refresh, tempo);

    // create web audio api context
    window.audioCtx = new(window.AudioContext || window.webkitAudioContext)();

};

let playNote = (note, beat, location) => {

    // Calculate the time for one sequence of all beats
    let sequenceTimeSeconds = tempo / 1000;

    let oneBeat = sequenceTimeSeconds / 8;

    let oscillator = audioCtx.createOscillator();

    oscillator.type = "sine";
    oscillator.connect(audioCtx.destination);

    let frequency = frequencyMapping[note];

    let noteStart = oneBeat * beat;

    let beatStart = audioCtx.currentTime + noteStart;
    let beatEnd = audioCtx.currentTime + noteStart + 0.1;

    oscillator.start(beatStart);

    oscillator.frequency.setValueAtTime(frequency, beatStart);

    oscillator.stop(beatEnd);

    // Light up note

    let row = location[0];
    let column = location[1];

    window.setTimeout(() => {

        let box = grid[row][column];

        box.style.backgroundColor = noteColours[note];

        window.setTimeout(() => {

            let box = grid[row][column];
            box.style.backgroundColor = "";

        }, 100);

    }, noteStart * 1000);

};