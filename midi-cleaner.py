import mido
from collections import defaultdict

INPUT_FILE = "./audio/song.mid"
OUTPUT_FILE = "./audio/song_clean.mid"
MAX_CHANNELS = 4

mid = mido.MidiFile(INPUT_FILE)
new_mid = mido.MidiFile()
track = mido.MidiTrack()
new_mid.tracks.append(track)

# Track when each channel becomes free
channel_busy_until = [0.0] * MAX_CHANNELS

current_time = 0.0

# Collect all note events with absolute timing
events = []

for msg in mid:
    current_time += msg.time
    if msg.type in ['note_on', 'note_off']:
        events.append((current_time, msg))

# Active notes tracking
active_notes = {}

for time_stamp, msg in events:
    if msg.type == 'note_on' and msg.velocity > 0:
        duration = 0.5  # fallback duration if no note_off found

        # Try to find matching note_off
        for t2, msg2 in events:
            if (
                msg2.type in ['note_off', 'note_on']
                and msg2.note == msg.note
                and t2 > time_stamp
            ):
                duration = t2 - time_stamp
                break

        # Find free channel
        assigned_channel = None
        for ch in range(MAX_CHANNELS):
            if channel_busy_until[ch] <= time_stamp:
                assigned_channel = ch
                break

        if assigned_channel is None:
            # Drop note if no channel available
            continue

        # Schedule note
        channel_busy_until[assigned_channel] = time_stamp + duration

        # Add note_on
        track.append(mido.Message(
            'note_on',
            note=msg.note,
            velocity=msg.velocity,
            time=0,
            channel=assigned_channel
        ))

        # Add note_off
        track.append(mido.Message(
            'note_off',
            note=msg.note,
            velocity=0,
            time=int(duration * mid.ticks_per_beat),
            channel=assigned_channel
        ))

# Save cleaned MIDI
new_mid.save(OUTPUT_FILE)

print("Clean MIDI saved as:", OUTPUT_FILE)