let you;

let currentBeat;
let tempo = 2000;
let grid = [];

// Flag for initialisation information
let started;

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
};

// Add note colours to keys

document.querySelectorAll("[data-note]").forEach((key, index) => {

  let colourMarker = document.createElement("span");
  colourMarker.setAttribute("class", "colourmarker");
  colourMarker.style.backgroundColor = noteColours[index];

  key.insertAdjacentElement("beforeend", colourMarker);

})

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

let generateGrid = function () {
  let size = 12;

  for (let row = 0; row < size; row += 1) {
    grid.push([]);

    for (let column = 0; column < size; column += 1) {
      let box = document.createElement("div");
      box.setAttribute("class", "box");
      document
        .getElementById("wrapper")
        .insertAdjacentElement("beforeend", box);

      grid[row][column] = box;
    }
  }
};

let apiRequest = params => {

  url = "/api?params=" + encodeURIComponent(JSON.stringify(params));

  return fetch(new Request(url)).then(response => response.json());

};

// Store of linked users' notes per beat

let linkedBeatNotes = [];

let playNotes = () => {
  linkedBeatNotes.forEach((notes, beat) => {
    playBeat(beat, notes);
  });
};

let refreshPositions = users => {

  // Store occupied positions so we can clear the rest
  let occupied = [];

  for (let user in users) {
    user = users[user];

    // Find element in lookup matrix

    let row = user.location[0];
    let column = user.location[1];

    let location = grid[row][column];

    // Clear you attribute in case you were previously in that square

    location.removeAttribute("data-you");

    occupied.push(location);

    location.innerHTML = mapping[user.note];

    if (user.id === you.id) {
      location.setAttribute("data-you", "true");
    }
  }

  // Clear all unused locations

  document.querySelectorAll(".box").forEach(e => {
    if (occupied.indexOf(e) === -1) {
      e.removeAttribute("data-you");
      e.innerHTML = "";
    }
  });
};

let refresh = function () {

  apiRequest({}).then(data => {
    // Check if the audiocontext has been suspended for some reason and change mute button

    if (window.audioCtx.state === "suspended") {
      document.getElementById("audio-toggle").innerHTML = "Unmute";
    } else {
      document.getElementById("audio-toggle").innerHTML = "Mute";
    }

    let status = data.gridStatus;

    linkedBeatNotes = status.beatNotes;

    let users = status.users;

    you = status.you;

    refreshPositions(users);

    // Add starting note and beat if not set already

    if (!started) {
      changeNote(you.note.toString());

      setBeat(you.beat);

      started = true;
    }
  });
};

// Move current user to a square

let move = function (row, column) {
  apiRequest({ move: { row: row, column: column } });
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

// UGH - Safari does weird things with button elements and flexbox that I can't work out and I want them for accessibility so...

let iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

if (iOS) {
  document.querySelectorAll(".controls button").forEach(b => {
    b.outerHTML = b.outerHTML.split("button").join("div");
  });
}

// Map arrow buttons to move directions

document.querySelectorAll(".arrow").forEach(a => {
  let direction = a.getAttribute("data-direction");

  a.addEventListener("click", () => {
    moveDirection(direction);
  });
});

// Arrow shortcuts

document.addEventListener("keydown", function (event) {
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

let note = noteNumber => {
  apiRequest({ note: noteNumber });

  // Highlight the user's selected note.
  // Can change to this straight away as nothing blocks it

  changeNote(noteNumber.toString());
};

let changeNote = noteNumber => {
  document.querySelectorAll("[data-note]").forEach(k => {
    let keyNote = k.getAttribute("data-note");
    if (keyNote === noteNumber) {
      k.setAttribute("data-selected", "true");
    } else {
      k.removeAttribute("data-selected");
    }
  });
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

let beat = function (beatNumber, on) {
  let request;

  if (on) {
    request = {beatIn: beatNumber}
  } else {
    request = {beatOut: beatNumber}
  }

  apiRequest(request).then(result => {
    setBeat(result.gridStatus.you.beat);
  });
};

let setBeat = beatList => {
  
  // Highlight the user's selected beats

  document.querySelectorAll("[data-beat]").forEach(b => {
    let beat = parseInt(b.getAttribute("data-beat"));

    if (beatList.indexOf(beat) !== -1) {
      b.setAttribute("data-selected", "true");
    } else {
      b.setAttribute("data-selected", "false");
    }
  });
};

let start = () => {
  // Hide holding screen

  document.body.removeAttribute("data-panel");

  if (started) {
    return false;
  }

  // Show footer

  document.querySelector("footer").style.display = "flex";

  // Generate grid and lookup matrix

  generateGrid();

  // Tempo
  window.setInterval(refresh, tempo);

  // Delay playback loop so that new beats can catch up
  window.setTimeout(() => {
    window.setInterval(playNotes, tempo);
  }, tempo / 2);

  // create web audio api context
  window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
};

let playBeat = (beat, beatNotes) => {
  //  Get all notes in beat for background colours

  let notes = beatNotes.map(u => {
    return noteColours[u.note];
  });

  let background = "";

  if (notes.length) {
    background = "radial-gradient(circle, " + notes.join(", ") + ", black)";
  }

  beatNotes.forEach((b, i) => {
    playNote(b.note, beat, b.location, background);
  });
};

let playNote = (note, beat, location, background) => {
  // Calculate the time for one sequence of all beats
  let sequenceTimeSeconds = tempo / 1000;

  let oneBeat = sequenceTimeSeconds / 16;

  let oscillator = window.audioCtx.createOscillator();
  oscillator.type = "sawtooth";

  let gain = window.audioCtx.createGain();

  oscillator.connect(gain);

  gain.connect(window.audioCtx.destination);

  gain.gain.value = 0;

  let frequency = frequencyMapping[note];

  let noteStart = oneBeat * beat;

  let attack = oneBeat / 3;
  let release = oneBeat / 4;

  let beatStart = window.audioCtx.currentTime + noteStart;

  oscillator.start(beatStart);

  gain.gain.linearRampToValueAtTime(1, beatStart + attack);
  gain.gain.linearRampToValueAtTime(0, beatStart + attack + release);

  oscillator.frequency.setValueAtTime(frequency, beatStart);

  // Stop oscillator when finished
  oscillator.stop(beatStart + attack + release);

  // Light up note

  let row = location[0];
  let column = location[1];

  window.setTimeout(() => {
    // Increment current beat for highlighting
    if (currentBeat !== beat) {
      currentBeat = beat;
    }

    document
      .querySelector(`[data-beat="${currentBeat}"]`)
      .setAttribute("data-current", "true");

    let box = grid[row][column];

    box.style.backgroundColor = noteColours[note];
    document.body.style.backgroundImage = background;

    if (window.midiOut) {
      // Play midi note if set
      window.midiOut.send([0x90, 60 + parseInt(note), 100]);
    }

    window.setTimeout(() => {
      box.style.backgroundColor = "";
      document
        .querySelector(`[data-beat="${currentBeat}"]`)
        .removeAttribute("data-current");
    }, 100);

    // Turn off midi note if set

    if (window.midiOut) {
      window.midiOut.send([0x80, 60, 100]);
    }
  }, noteStart * 1000);
};

document.getElementById("start").onclick = start;

document.getElementById("options-form").addEventListener("submit", e => {
  e.preventDefault();

  document.body.removeAttribute("data-panel");

  let sharpsOrFlats = document.getElementById("sharps_flats").value;

  if (sharpsOrFlats === "sharps") {
    mapping = noteMappingSharps;
  } else if (sharpsOrFlats === "flats") {
    mapping = noteMappingFlats;
  }

  let midiDevice = document.getElementById("midi-device").value;

  if (midiDevice) {
    window.midiOut = window.midioutputs[midiDevice];
  }
});

// Make help button toggle intro again

document.getElementById("help-toggle").onclick = function () {
  document.body.setAttribute("data-panel", "intro");
};

document.getElementById("options-toggle").onclick = function () {
  document.body.setAttribute("data-panel", "options");

  // Check if web midi is supported

  if (navigator.requestMIDIAccess) {
    document.getElementById("midi-or-not").innerHTML =
      "Your browser supports WebMIDI";
    document.getElementById("midi-options").style.display = "block";
  } else {
    document.getElementById("midi-or-not").innerHTML =
      "Your browser does not support WebMIDI";
    document.getElementById("midi-options").style.display = "none";
  }
};

// Web MIDI integration

window.midiOut = null;
window.midioutputs = [];

document.getElementById("request-midi-access").addEventListener("click", () => {
  let midiAccessSuccess = midi => {
    let outputs = midi.outputs;

    outputs.forEach(function (output) {
      window.midioutputs[output.name] = output;
      document
        .getElementById("midi-device")
        .insertAdjacentHTML(
          "afterBegin",
          `<option value="${output.name}">${output.name}</option>`
        );
    });
  };

  let midiAccessFail = () => {
    alert("MIDI access failed");
  };

  navigator.requestMIDIAccess().then(midiAccessSuccess, midiAccessFail);
});

// AudioContext toggle on and off for muting and also for browsers that suspend it when focus lost etc

document.getElementById("audio-toggle").onclick = function () {
  if (window.audioCtx.state === "suspended") {
    window.audioCtx.resume();
    document.getElementById("audio-toggle").innerHTML = "Mute";
  } else {
    window.audioCtx.suspend();
    document.getElementById("audio-toggle").innerHTML = "Unmute";
  }
};
