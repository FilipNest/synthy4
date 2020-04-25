let you;

let currentBeat = 0;
let tempo = 500;

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
    // Clear grid each time to make this easy

    document.getElementById("wrapper").innerHTML = "";

    let size = 12;

    let row = 0;

    for (let i = 0; i < size * size; i += 1) {
        // Increment rows

        if (i > 1 && i % size === 0) {
            row += 1;
        }

        let box = document.createElement("div");
        box.setAttribute("class", "box");
        box.setAttribute("data-location", i);
        box.setAttribute("data-column", i % size);
        box.setAttribute("data-row", row);
        document.getElementById("wrapper").insertAdjacentElement("beforeend", box);
    }
};

let makeRequest = url => {
    return fetch(new Request(url)).then(response => response.json());
};

let refresh = function() {
    generateGrid();

    // Get status

    makeRequest("/status").then(data => {
        let users = data.users;
        you = users[data.you];

        for (let user in users) {
            user = users[user];

            document.querySelector(`[data-location="${user.location}"]`).innerHTML =
                mapping[user.note];

            if (user.id === you.id) {
                document
                    .querySelector(`[data-location="${user.location}"]`)
                    .setAttribute("data-you", "true");
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

        // Get your adjacent users

        let linked = getLinked(users);

        // Filter out the notes that don't share the current beat

        let play = linked.filter(u => u.beat === currentBeat);

        if (play.length) {
            play.forEach((n, i) => {
                // Light up square

                let square = document
                    .querySelector(`[data-location="${n.location}"`)
                    .setAttribute("data-playing", "true");

                playNote(n.note, i);
            });
        }

        // Increment current beat

        currentBeat += 1;

        if (currentBeat >= 8) {
            currentBeat = 0;
        }
    });
};

// Move current user to a square

let move = function(position) {
    makeRequest("/move?" + position);
};

let moveDirection = direction => {
    let yourSquare = document.querySelector("[data-you]");

    if (!yourSquare) {
        return false;
    }

    let yourRow = parseInt(yourSquare.getAttribute("data-row"));
    let yourColumn = parseInt(yourSquare.getAttribute("data-column"));

    let targetRow = yourRow;
    let targetColumn = yourColumn;

    switch (direction) {
        case "up":
            targetRow -= 1;
            break;
        case "down":
            targetRow += 1;
            break;
        case "left":
            targetColumn -= 1;
            break;
        case "right":
            targetColumn += 1;
            break;
    }

    let target = document.querySelector(
        `[data-row="${targetRow}"][data-column="${targetColumn}"]`
    );

    // Check if target exists

    if (target) {
        let position = target.getAttribute("data-location");

        move(position);
    }
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
        beat(beatNumber, on);
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

// Function for checking if your square is surrounded by any others

let getLinked = users => {
    let yourSquare = document.querySelector("[data-you]");

    if (!yourSquare) {
        return false;
    }

    let yourRow = parseInt(yourSquare.getAttribute("data-row"));
    let yourColumn = parseInt(yourSquare.getAttribute("data-column"));

    let notes = [];

    for (let userID in users) {
        let user = users[userID];
        let square = document.querySelector(`[data-location="${user.location}"]`);

        let userRow = parseInt(square.getAttribute("data-row"));
        let userColumn = parseInt(square.getAttribute("data-column"));

        // First check if in same row or adjacent rows

        if (
            userRow === yourRow ||
            userRow === yourRow - 1 ||
            userRow === yourRow + 1
        ) {
            // Then check adjacent columns

            if (
                userColumn === yourColumn ||
                userColumn === yourColumn - 1 ||
                userColumn === yourColumn + 1
            ) {
                notes.push({
                    note: user.note,
                    beat: user.beat,
                    location: user.location
                });
            }
        }
    }

    return notes;
};

let start = () => {
    document.getElementById("start").style.display = "none";

    // Tempo
    window.setInterval(refresh, tempo);

    // Audio stuff

    window.oscillators = [];

    // Generate 9 oscillators as that's the maximum we'll use

    // create web audio api context
    window.audioCtx = new(window.AudioContext || window.webkitAudioContext)();

    for (let i = 0; i <= 9; i += 1) {
        // create Oscillator node
        let oscillator = audioCtx.createOscillator();

        oscillator.type = "sine";
        oscillator.connect(audioCtx.destination);

        oscillators.push(oscillator);

        oscillator.frequency.setValueAtTime(0, audioCtx.currentTime);

        oscillator.start();
    }
};

let playNote = (note, osc) => {
    let oscillator = oscillators[osc];

    let frequency = frequencyMapping[note];

    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    window.setTimeout(function() {
        oscillator.frequency.setValueAtTime(0, audioCtx.currentTime);
    }, (tempo - 100));

};