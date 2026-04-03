const fs = require("fs");
const path = require("path");
const { Midi } = require("@tonejs/midi");
const { Select } = require("enquirer");
const { SerialPort } = require("serialport");

// --- NEW UI IMPORTS ---
const figlet = require("figlet");
const gradient = require("gradient-string").default || require("gradient-string");
const chalk = require("chalk");
const ora = require("ora");
const logUpdate = require("log-update");

const MIDI_PATH = "./audio/compressed";
const ARDUINO_PORT = "/dev/tty.usbserial-A5069RR4"; // For testing without Arduino, run ls /dev/tty.* to find the correct port
const BAUD_RATE = 9600; // Match the Arduino baud rate

function midiNoteToFreq(note) {
  // f = 440 * 2^((n-69)/12)
  return Math.round(440 * Math.pow(2, (note - 69) / 12));
}

function getMidiFiles() {
  if (!fs.existsSync(MIDI_PATH) || !fs.statSync(MIDI_PATH).isDirectory()) {
    throw new Error(`MIDI directory not found: ${MIDI_PATH}`);
  }

  return fs.readdirSync(MIDI_PATH)
    .filter((fileName) => {
      const extension = path.extname(fileName).toLowerCase();
      return extension === ".mid" || extension === ".midi";
    })
    .sort((left, right) => left.localeCompare(right));
}

async function selectMidiFile() {
  const midiFiles = getMidiFiles();

  if (midiFiles.length === 0) {
    throw new Error(`No MIDI files found in ${MIDI_PATH}`);
  }

  const prompt = new Select({
    name: "midiFile",
    message: chalk.cyan.bold("Select a MIDI file to play:"),
    choices: midiFiles,
  });

  const selectedFile = await prompt.run();
  return path.join(MIDI_PATH, selectedFile);
}

function playMidi(port, midiFile) {
  const midiData = fs.readFileSync(midiFile);
  const midi = new Midi(midiData);
  let events = [];

  midi.tracks.forEach((track, motorIndex) => {
    if (motorIndex > 3) return;
    track.notes.forEach((note) => {
      const freq = midiNoteToFreq(note.midi);
      events.push({ time: note.time, motor: motorIndex, freq: freq });
      events.push({ time: note.time + note.duration, motor: motorIndex, freq: 0 });
    });
  });

  events.sort((a, b) => a.time - b.time);

  // Fix: Ensure gradient is usable
  const grad = require("gradient-string").default || require("gradient-string");

  console.clear();
  console.log(grad('cyan', 'blue')(figlet.textSync("LIVE SESSION", { font: "Standard" })));
  console.log(chalk.gray("--------------------------------------------------"));
  
  const spinner = ora({
    text: chalk.blue("Synchronizing with Arduino..."),
    spinner: "dots12",
  }).start();

  setTimeout(() => {
    spinner.succeed(chalk.green.bold("PLAYBACK ACTIVE\n"));

    const startTime = Date.now();
    let currentFreqs = [0, 0, 0, 0];
    let lastUiUpdate = 0;
    const totalEvents = events.length;

    const interval = setInterval(() => {
      const currentTime = (Date.now() - startTime) / 1000;
      let changed = false;

      while (events.length > 0 && events[0].time <= currentTime) {
        const ev = events.shift();
        port.write(`M${ev.motor} F${ev.freq}\n`);
        currentFreqs[ev.motor] = ev.freq;
        changed = true;
      }

      // Render UI only if frequencies changed OR every 50ms for the progress bar
      if (changed || (Date.now() - lastUiUpdate > 50)) {
        const colors = [chalk.redBright, chalk.greenBright, chalk.yellowBright, chalk.blueBright];
        
        const bigReadouts = currentFreqs.map((freq, i) => {
          const val = freq > 0 ? `${freq}Hz` : "----";
          const art = figlet.textSync(val, { font: 'Big' }); // 'Big' is massive
          
          const label = ` MOTOR ${i} `;
          const coloredLabel = freq > 0 ? colors[i].inverse(label) : chalk.bgWhite.black(label);
          const coloredArt = freq > 0 ? grad('#FF8C00', '#FF0000')(art) : chalk.gray(art);
          
          return `${coloredLabel}\n${coloredArt}`;
        });

        const percent = Math.round(((totalEvents - events.length) / totalEvents) * 100);
        const bar = "█".repeat(Math.round(percent / 4)) + "░".repeat(25 - Math.round(percent / 4));

        logUpdate(
          chalk.cyan.bold(` PROGRESS [${bar}] ${percent}%\n`) +
          bigReadouts.join('\n')
        );
        
        lastUiUpdate = Date.now();
      }

      if (events.length === 0) {
        clearInterval(interval);
        logUpdate.clear();
        console.log(grad('magenta', 'yellow')(figlet.textSync("FINISHED", { font: "Standard" })));
        for (let i = 0; i < 4; i++) port.write(`M${i} F0\n`);
        port.close(() => process.exit(0));
      }
    }, 5);
  }, 3000);
}

async function main() {
  console.clear();
  // Big rainbow startup banner
  console.log(gradient.rainbow.multiline(figlet.textSync("MIDI MOTORS", { font: "Standard" })));
  console.log(chalk.gray("==============================================================\n"));

  const midiFile = await selectMidiFile();
  
  const port = new SerialPort({ path: ARDUINO_PORT, baudRate: BAUD_RATE });
  port.on("open", () => playMidi(port, midiFile));
  port.on("error", (err) => console.error(chalk.red.bold("\nSerial error:"), err));
}

main().catch((err) => {
  console.error(chalk.red.inverse(`\n ERROR `), chalk.red(err.message));
  process.exit(1);
});