const fs = require("fs");
const path = require("path");
const { Midi } = require("@tonejs/midi");

const INPUT_PATH = "./audio/og";
const OUTPUT_PATH = "./audio/compressed";

function cleanMidiFile(inputFile, outputFile) {
  const midiData = fs.readFileSync(inputFile);
  const midi = new Midi(midiData);
  
  // Create a new empty MIDI for our 4 motors
  const cleanMidi = new Midi();
  const tracks = [
    cleanMidi.addTrack(), cleanMidi.addTrack(), 
    cleanMidi.addTrack(), cleanMidi.addTrack()
  ];

  let allNotes = [];

  // Extract notes, ignore percussion (channel 9/10)
  midi.tracks.forEach(track => {
    if (track.channel === 9) return; 
    track.notes.forEach(note => {
      allNotes.push(note);
    });
  });

  // Sort notes by start time
  allNotes.sort((a, b) => a.time - b.time);

  // Simple Voice Allocation (assign note to the first available motor)
  let motorEndTimes = [0, 0, 0, 0];

  allNotes.forEach(note => {
    for (let i = 0; i < 4; i++) {
      if (note.time >= motorEndTimes[i]) {
        // Motor is free! Assign note.
        tracks[i].addNote({
          midi: note.midi,
          time: note.time,
          duration: note.duration,
          velocity: 1 // Max velocity
        });
        motorEndTimes[i] = note.time + note.duration;
        break; 
      }
    }
  });

  fs.writeFileSync(outputFile, Buffer.from(cleanMidi.toArray()));
  console.log(`Cleaned ${path.basename(inputFile)} -> ${outputFile}`);
}

function cleanMidiDirectory() {
  if (!fs.existsSync(INPUT_PATH) || !fs.statSync(INPUT_PATH).isDirectory()) {
    throw new Error(`Input directory not found: ${INPUT_PATH}`);
  }

  fs.mkdirSync(OUTPUT_PATH, { recursive: true });

  const midiFiles = fs.readdirSync(INPUT_PATH)
    .filter(fileName => {
      const extension = path.extname(fileName).toLowerCase();
      return extension === ".mid" || extension === ".midi";
    });

  if (midiFiles.length === 0) {
    console.log(`No MIDI files found in ${INPUT_PATH}`);
    return;
  }

  midiFiles.forEach(fileName => {
    const inputFile = path.join(INPUT_PATH, fileName);
    const outputFile = path.join(OUTPUT_PATH, fileName);
    cleanMidiFile(inputFile, outputFile);
  });

  console.log(`Processed ${midiFiles.length} MIDI file(s) from ${INPUT_PATH} to ${OUTPUT_PATH}`);
}

cleanMidiDirectory();