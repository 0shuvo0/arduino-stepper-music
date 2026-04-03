# Playing Music with Stepper Motors

[![Demo](preview.png)](https://www.facebook.com/share/v/1NHMwC1gs9/)

### Requirements

* 4 stepper motors
* 4 stepper motor drivers
* Arduino Uno
* Arduino CNC shield
* [Node.js](https://nodejs.org/en/download/) installed

---

### Setup

Simply plug the motors and drivers into the CNC shield, then connect the shield to the Arduino.

Below is an example of one motor connected. Connect all 4 motors in the same way to the CNC shield.

![Motors Wiring](wiring-example.png)

*For the fourth (A-axis) motor to work independently, you need to connect two jumper wires like this:*

![A axis Wiring](cnc-jumper-config.png)

---

### Usage

1. Clone the repository and navigate to the project directory.
2. Open a terminal in the *scripts* folder and run `npm install` to install the required dependencies.
3. Connect the Arduino to your computer and upload the `src/main.cpp` sketch using *PlatformIO* or the *Arduino IDE*.
4. Open `scripts/midi-sender.js` in a text editor and set the `ARDUINO_PORT` variable on line 15 to the correct port where your Arduino is connected.

   * On **Windows**, you can find available ports by running `mode` in Command Prompt.
   * On **Linux & macOS**, you can find available ports by running `ls /dev/tty*` in the terminal.
5. Run `npm start` in the terminal (make sure you are in the *scripts* folder). This will display a list of available songs. Use the arrow keys to select a song and press Enter to start playing.

---

### Additional Notes

* To add your own MIDI files, place them in the `scripts/audio/og` folder and run `npm run clean`. The next time you run `npm start`, your songs will appear in the list.
* With only 4 stepper motors, you can play only simple MIDI files. Complex music will not sound good.

