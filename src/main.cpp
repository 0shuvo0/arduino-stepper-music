#include <Arduino.h>
#include <AccelStepper.h>

#define ENABLE_PIN 8

#define STEP_X_PIN 2
#define DIR_X_PIN 5

#define STEP_Y_PIN 3
#define DIR_Y_PIN 6

#define STEP_Z_PIN 4
#define DIR_Z_PIN 7

#define STEP_A_PIN 12
#define DIR_A_PIN 13

AccelStepper stepperA(AccelStepper::DRIVER, STEP_X_PIN, DIR_X_PIN);
AccelStepper stepperB(AccelStepper::DRIVER, STEP_Z_PIN, DIR_Z_PIN);
AccelStepper stepperC(AccelStepper::DRIVER, STEP_Y_PIN, DIR_Y_PIN);
AccelStepper stepperD(AccelStepper::DRIVER, STEP_A_PIN, DIR_A_PIN);

AccelStepper* motors[] = {&stepperA, &stepperB, &stepperC, &stepperD};

// Serial buffer variables
const byte MAX_BUFFER = 32;
char serialBuffer[MAX_BUFFER];
byte bufferIndex = 0;

void setup() {
  Serial.begin(9600);

  // Enable the CNC Shield
  pinMode(ENABLE_PIN, OUTPUT);
  digitalWrite(ENABLE_PIN, LOW); // LOW enables the A4988 drivers

  // Configure all motors
  for (int i = 0; i < 4; i++) {
    motors[i]->setMaxSpeed(4000.0); // Allow high frequencies
    motors[i]->setAcceleration(0);  // Acceleration messes with music, disable it
    motors[i]->setSpeed(0);
  }
}

// Custom parser to split "M0 F440" instantly without blocking
void processCommand() {
  if (serialBuffer[0] == 'M') {
    int motorId = serialBuffer[1] - '0'; // Convert char to int
    
    // Find the 'F'
    char* fPos = strchr(serialBuffer, 'F');
    if (fPos != NULL && motorId >= 0 && motorId <= 3) {
      int freq = atoi(fPos + 1);
      
      if (freq == 0) {
        motors[motorId]->setSpeed(0);
      } else {
        // Set speed to the target frequency (steps per second)
        motors[motorId]->setSpeed(freq);
      }
    }
  }
}

void loop() {
  // Non-blocking Serial Read
  while (Serial.available() > 0) {
    char inChar = Serial.read();

    //print in serial monitor
    Serial.print(inChar);
    
    if (inChar == '\n') {
      serialBuffer[bufferIndex] = '\0'; // Null terminate
      processCommand();
      bufferIndex = 0; // Reset buffer
    } 
    else if (bufferIndex < MAX_BUFFER - 1) {
      serialBuffer[bufferIndex++] = inChar;
    }
  }

  // Constantly step the motors at their set speeds
  stepperA.runSpeed();
  stepperB.runSpeed();
  stepperC.runSpeed();
  stepperD.runSpeed();
}