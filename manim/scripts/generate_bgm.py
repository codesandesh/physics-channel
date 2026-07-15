#!/usr/bin/env python3
"""
BGM Generator — 100 unique copyright-free background music tracks.
Synthesized from scratch using numpy: pure waveforms, no samples, no noise.
Fast-paced (120–175 BPM), loopable, 30-second tracks.

Output: /manim/renders/bgm_lib/bgm_001.mp3 … bgm_100.mp3
"""

import numpy as np
from scipy.io import wavfile
from scipy.signal import lfilter
import subprocess, os, sys, tempfile

SR = 44100
DURATION = 30

OUT_DIR = "/manim/renders/bgm_lib"
os.makedirs(OUT_DIR, exist_ok=True)

# ── Musical definitions ─────────────────────────────────────────────────────

SCALES = {
    "major":      [0, 2, 4, 5, 7, 9, 11],
    "minor":      [0, 2, 3, 5, 7, 8, 10],
    "dorian":     [0, 2, 3, 5, 7, 9, 10],
    "phrygian":   [0, 1, 3, 5, 7, 8, 10],
    "lydian":     [0, 2, 4, 6, 7, 9, 11],
    "mixolydian": [0, 2, 4, 5, 7, 9, 10],
    "pentatonic": [0, 2, 4, 7, 9, 12],
    "blues":      [0, 3, 5, 6, 7, 10, 12],
}

# Chord degrees (intervals in semitones from root)
CHORD_PROGS = {
    "I_V_vi_IV":   [[0,4,7], [7,11,14], [9,12,16], [5,9,12]],
    "i_VII_VI":    [[0,3,7], [10,14,17], [8,12,15], [10,14,17]],
    "i_iv_v":      [[0,3,7], [5,8,12], [7,10,14], [5,8,12]],
    "I_IV_V":      [[0,4,7], [5,9,12], [7,11,14], [5,9,12]],
    "i_VI_III_VII":[[0,3,7], [8,12,15], [3,7,10], [10,14,17]],
    "I_ii_IV_V":   [[0,4,7], [2,5,9], [5,9,12], [7,11,14]],
    "i_ii_dim_V":  [[0,3,7], [2,5,8], [7,10,14], [7,11,14]],
    "I_III_IV_iv": [[0,4,7], [4,7,11], [5,9,12], [5,8,12]],
}

PROG_NAMES = list(CHORD_PROGS.keys())

def midi_to_hz(m):
    return 440.0 * (2.0 ** ((m - 69) / 12.0))

def scale_notes(root_midi, scale_name, octaves=3):
    s = SCALES[scale_name]
    notes = []
    for o in range(octaves):
        for interval in s:
            notes.append(root_midi + o * 12 + interval)
    return notes

# ── Waveform generators ─────────────────────────────────────────────────────

def wave_sine(freq, t):
    return np.sin(2 * np.pi * freq * t)

def wave_square(freq, t, n_harmonics=7):
    w = np.zeros_like(t)
    for k in range(n_harmonics):
        h = 2 * k + 1
        w += np.sin(2 * np.pi * h * freq * t) / h
    return w / (np.max(np.abs(w)) + 1e-9)

def wave_sawtooth(freq, t, n_harmonics=8):
    w = np.zeros_like(t)
    for k in range(1, n_harmonics + 1):
        w += ((-1) ** (k + 1)) * np.sin(2 * np.pi * k * freq * t) / k
    return w / (np.max(np.abs(w)) + 1e-9)

def wave_triangle(freq, t):
    p = (freq * t) % 1.0
    return 2.0 * np.abs(2 * p - 1) - 1

def wave_soft(freq, t):
    return np.tanh(2.0 * np.sin(2 * np.pi * freq * t))

def wave_harmonic(freq, t):
    w = (  np.sin(2*np.pi*1*freq*t)
         + 0.50*np.sin(2*np.pi*2*freq*t)
         + 0.25*np.sin(2*np.pi*3*freq*t)
         + 0.12*np.sin(2*np.pi*4*freq*t)
         + 0.06*np.sin(2*np.pi*5*freq*t))
    return w / 1.93

WAVERS = {
    "sine":     wave_sine,
    "square":   wave_square,
    "sawtooth": wave_sawtooth,
    "triangle": wave_triangle,
    "soft":     wave_soft,
    "harmonic": wave_harmonic,
}

def make_note(midi_n, dur_s, wtype="sine", amp=0.4,
              attack=0.008, decay=0.04, sustain_level=0.7, release=0.06):
    n = int(dur_s * SR)
    t = np.linspace(0, dur_s, n, endpoint=False)
    w = WAVERS[wtype](midi_to_hz(midi_n), t) * amp

    atk = max(1, int(attack * SR))
    dcy = max(1, int(decay * SR))
    rel = max(1, int(release * SR))
    env = np.ones(n)
    env[:atk] = np.linspace(0, 1, atk)
    end_atk = atk + dcy
    if end_atk < n:
        env[atk:end_atk] = np.linspace(1, sustain_level, dcy)
    if end_atk < n - rel:
        env[end_atk:n - rel] = sustain_level
    if n > rel:
        env[-rel:] = np.linspace(sustain_level, 0, rel)
    return (w * env).astype(np.float32)

def make_kick(dur_s=0.25, amp=0.85):
    n = int(dur_s * SR)
    t = np.linspace(0, dur_s, n, endpoint=False)
    pitch_env = 120 * np.exp(-18 * t) + 45
    phase = np.cumsum(2 * np.pi * pitch_env / SR)
    k = np.sin(phase) * np.exp(-8 * t) * amp
    return k.astype(np.float32)

def make_snare(dur_s=0.18, amp=0.45):
    n = int(dur_s * SR)
    t = np.linspace(0, dur_s, n, endpoint=False)
    body = np.sin(2 * np.pi * 185 * t) * np.exp(-18 * t)
    crack = np.random.randn(n) * np.exp(-20 * t)
    s = (body * 0.4 + crack * 0.6) * amp
    return s.astype(np.float32)

def make_hihat(dur_s=0.04, amp=0.18, bright=True):
    n = int(dur_s * SR)
    noise = np.random.randn(n).astype(np.float32)
    # Highpass for open hat brightness
    if bright:
        b = np.array([1.0, -0.97])
        noise = lfilter(b, [1.0], noise)
    else:
        b = np.array([1.0, -0.93])
        noise = lfilter(b, [1.0], noise)
    noise *= np.exp(-30 * np.linspace(0, dur_s, n)) * amp
    return noise.astype(np.float32)

def make_chord(midi_notes, dur_s, wtype="soft", amp=0.22, release=0.08):
    layers = [make_note(m, dur_s, wtype, amp / len(midi_notes),
                        attack=0.012, decay=0.06, sustain_level=0.65, release=release)
              for m in midi_notes]
    total = np.zeros(max(len(l) for l in layers), dtype=np.float32)
    for l in layers:
        total[:len(l)] += l
    return total

def place(buf, signal, start_sample):
    end = min(len(buf), start_sample + len(signal))
    width = end - start_sample
    if width > 0:
        buf[start_sample:end] += signal[:width]

def apply_fade(audio, fade_in=1.2, fade_out=2.0):
    n = len(audio)
    fi = int(fade_in * SR)
    fo = int(fade_out * SR)
    audio[:fi] *= np.linspace(0, 1, fi)
    audio[-fo:] *= np.linspace(1, 0, fo)
    return audio

def normalize(audio, peak=0.88):
    mx = np.max(np.abs(audio))
    if mx > 0:
        audio = audio / mx * peak
    return audio

def to_stereo(mono, delay_ms=1.5, width=0.08):
    n = len(mono)
    delay_s = int(delay_ms / 1000 * SR)
    left = mono.copy()
    right = np.zeros(n, dtype=np.float32)
    right[delay_s:] = mono[:n - delay_s] * (1 - width)
    right[:delay_s] = mono[:delay_s]
    return np.stack([left, right], axis=1).astype(np.float32)

def save_mp3(audio_stereo, track_num):
    wav_path = f"/tmp/bgm_tmp_{track_num:03d}.wav"
    mp3_path = os.path.join(OUT_DIR, f"bgm_{track_num:03d}.mp3")
    audio_int = np.clip(audio_stereo, -1, 1)
    audio_int = (audio_int * 32767).astype(np.int16)
    wavfile.write(wav_path, SR, audio_int)
    subprocess.run(
        ["ffmpeg", "-y", "-i", wav_path,
         "-acodec", "libmp3lame", "-ab", "192k",
         "-ar", "44100", "-ac", "2", mp3_path],
        check=True, capture_output=True
    )
    os.remove(wav_path)
    print(f"  Saved: {mp3_path}")

# ── Style generators ────────────────────────────────────────────────────────

def gen_driving(root, bpm, scale_name, wtype):
    """Kick + hi-hat + bass line + synth lead. Energetic dance/electronic."""
    beat = 60.0 / bpm
    n = int(DURATION * SR)
    buf = np.zeros(n, dtype=np.float32)
    sc = SCALES[scale_name]

    # Pattern kicks (4 on the floor)
    for i in range(int(DURATION / beat) + 1):
        pos = int(i * beat * SR)
        k = make_kick(0.22)
        place(buf, k, pos)

    # Snare on beats 2 and 4
    for i in range(int(DURATION / beat) + 1):
        if i % 4 in (1, 3):
            pos = int(i * beat * SR)
            sn = make_snare(0.15)
            place(buf, sn, pos)

    # Hi-hat 8th notes
    hat_step = beat / 2
    for i in range(int(DURATION / hat_step) + 1):
        pos = int(i * hat_step * SR)
        h = make_hihat(0.05, amp=0.12 if i % 2 == 0 else 0.08)
        place(buf, h, pos)

    # Bass line — root + 5th alternating, 8th notes
    bass_pattern = [sc[0], sc[0], sc[4], sc[0], sc[2], sc[0], sc[4], sc[2]]
    bass_step = beat / 2
    for i in range(int(DURATION / bass_step) + 1):
        midi_n = root + bass_pattern[i % len(bass_pattern)] - 12
        nd = bass_step * 0.85
        n_s = make_note(midi_n, nd, wtype, amp=0.30, attack=0.005, release=0.04)
        pos = int(i * bass_step * SR)
        place(buf, n_s, pos)

    # Lead melody — quarter notes, higher octave
    lead_pattern = [sc[4], sc[6 % len(sc)], sc[4], sc[2],
                    sc[4], sc[5 % len(sc)], sc[2], sc[0]]
    lead_step = beat
    for i in range(int(DURATION / lead_step) + 1):
        midi_n = root + lead_pattern[i % len(lead_pattern)] + 12
        nd = lead_step * 0.8
        n_s = make_note(midi_n, nd, "sine", amp=0.18, attack=0.01)
        pos = int(i * lead_step * SR)
        place(buf, n_s, pos)

    return normalize(apply_fade(buf))


def gen_arpeggio(root, bpm, scale_name, wtype):
    """Fast arpeggiated chords — clean, melodic, propulsive."""
    beat = 60.0 / bpm
    n = int(DURATION * SR)
    buf = np.zeros(n, dtype=np.float32)
    sc = SCALES[scale_name]

    # Kick on 1 and 3
    for i in range(int(DURATION / beat) + 1):
        if i % 4 in (0, 2):
            place(buf, make_kick(0.20, amp=0.7), int(i * beat * SR))

    # Hi-hat 16th notes
    hat16 = beat / 4
    for i in range(int(DURATION / hat16) + 1):
        amp = 0.10 if i % 4 == 0 else 0.06
        place(buf, make_hihat(0.03, amp=amp), int(i * hat16 * SR))

    # Arpeggio — 16th notes through chord tones
    arp_notes = [root + sc[0], root + sc[2], root + sc[4],
                 root + sc[0] + 12, root + sc[4], root + sc[2],
                 root + sc[0] + 12, root + sc[6 % len(sc)] + 12]
    arp_step = beat / 4
    for i in range(int(DURATION / arp_step) + 1):
        midi_n = arp_notes[i % len(arp_notes)]
        nd = arp_step * 0.75
        n_s = make_note(midi_n, nd, wtype, amp=0.28, attack=0.003, release=0.02)
        place(buf, n_s, int(i * arp_step * SR))

    # Pad chords — whole notes
    chord_tones = [[root + sc[0], root + sc[2], root + sc[4]],
                   [root + sc[3], root + sc[5 % len(sc)], root + sc[0] + 12],
                   [root + sc[4], root + sc[6 % len(sc)], root + sc[2] + 12],
                   [root + sc[2], root + sc[4], root + sc[6 % len(sc)]]]
    chord_dur = beat * 4
    for i in range(int(DURATION / chord_dur) + 1):
        ct = chord_tones[i % len(chord_tones)]
        ch = make_chord(ct, chord_dur, wtype="soft", amp=0.14)
        place(buf, ch, int(i * chord_dur * SR))

    return normalize(apply_fade(buf))


def gen_pulse(root, bpm, scale_name, wtype):
    """Pulsing tremolo pads + steady kick. Hypnotic, electronic."""
    beat = 60.0 / bpm
    n = int(DURATION * SR)
    buf = np.zeros(n, dtype=np.float32)
    sc = SCALES[scale_name]

    # Kick every beat
    for i in range(int(DURATION / beat) + 1):
        place(buf, make_kick(0.22, amp=0.80), int(i * beat * SR))

    # Snare every 4 beats (backbeat variation)
    for i in range(int(DURATION / (beat * 2)) + 1):
        place(buf, make_snare(0.16, amp=0.50), int((i * 2 + 1) * beat * SR))

    # Pulsed pad — tremolo effect via amplitude modulation
    t_all = np.linspace(0, DURATION, n, endpoint=False)
    trem_rate = bpm / 60.0 * 2  # tremolo synced to 8th notes
    trem = 0.5 + 0.5 * np.sin(2 * np.pi * trem_rate * t_all)

    for i, oct_offset in enumerate([0, 12]):
        f = midi_to_hz(root + sc[i % len(sc)] + oct_offset)
        pad_raw = WAVERS[wtype](f, t_all) * 0.20
        buf += (pad_raw * trem).astype(np.float32)

    # Short bass stabs on 16th positions
    stab_step = beat / 4
    stab_pattern = [1, 0, 0, 1, 1, 0, 0, 0]
    for i in range(int(DURATION / stab_step) + 1):
        if stab_pattern[i % len(stab_pattern)]:
            midi_n = root + sc[0] - 12
            nd = stab_step * 0.6
            n_s = make_note(midi_n, nd, "square", amp=0.22, attack=0.003, release=0.03)
            place(buf, n_s, int(i * stab_step * SR))

    return normalize(apply_fade(buf))


def gen_staccato(root, bpm, scale_name, wtype):
    """Short punchy staccato hits — percussive electronic music."""
    beat = 60.0 / bpm
    n = int(DURATION * SR)
    buf = np.zeros(n, dtype=np.float32)
    sc = SCALES[scale_name]

    # Kick on 1 and 3
    for i in range(int(DURATION / beat) + 1):
        if i % 4 in (0, 2):
            place(buf, make_kick(0.18, amp=0.75), int(i * beat * SR))

    # Snare on 2 and 4
    for i in range(int(DURATION / beat) + 1):
        if i % 4 in (1, 3):
            place(buf, make_snare(0.14, amp=0.55), int(i * beat * SR))

    # Open hi-hat on 8th notes
    hat8 = beat / 2
    for i in range(int(DURATION / hat8) + 1):
        h = make_hihat(0.08, amp=0.14, bright=True)
        place(buf, h, int(i * hat8 * SR))

    # Staccato melodic hits — very short, 16th notes, syncopated pattern
    mel_notes = [sc[0], sc[2], sc[4], sc[2], sc[5 % len(sc)], sc[4], sc[2], sc[0]]
    stac_pattern = [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]
    stac16 = beat / 4
    stac_dur = stac16 * 0.45
    for i in range(int(DURATION / stac16) + 1):
        if stac_pattern[i % len(stac_pattern)]:
            midi_n = root + mel_notes[(i // 2) % len(mel_notes)] + 12
            n_s = make_note(midi_n, stac_dur, wtype, amp=0.24, attack=0.002, release=0.02)
            place(buf, n_s, int(i * stac16 * SR))

    # Counter-melody 8th notes (quieter)
    cnt_notes = [sc[4], sc[6 % len(sc)], sc[4], sc[5 % len(sc)]]
    for i in range(int(DURATION / hat8) + 1):
        if i % 3 == 0:
            midi_n = root + cnt_notes[(i // 3) % len(cnt_notes)]
            nd = hat8 * 0.7
            n_s = make_note(midi_n, nd, "sine", amp=0.14, attack=0.005)
            place(buf, n_s, int(i * hat8 * SR))

    return normalize(apply_fade(buf))


def gen_bass_heavy(root, bpm, scale_name, wtype):
    """Heavy, deep bass focus with lighter upper elements."""
    beat = 60.0 / bpm
    n = int(DURATION * SR)
    buf = np.zeros(n, dtype=np.float32)
    sc = SCALES[scale_name]

    # Kick + side-chain effect (simplified: just strong kick)
    for i in range(int(DURATION / beat) + 1):
        place(buf, make_kick(0.28, amp=0.90), int(i * beat * SR))

    # Hi-hat 16th
    hat16 = beat / 4
    for i in range(int(DURATION / hat16) + 1):
        amp = 0.08 if i % 4 == 0 else 0.05
        place(buf, make_hihat(0.025, amp=amp), int(i * hat16 * SR))

    # Deep bass — root stays on 1, fills on 16ths
    bass_pat = [3, 0, 0, 2, 0, 1, 0, 3, 0, 0, 1, 0, 2, 0, 1, 0]
    bass16 = beat / 4
    for i in range(int(DURATION / bass16) + 1):
        midi_n = root + sc[bass_pat[i % len(bass_pat)]] - 24  # two octaves down
        nd = bass16 * 0.95
        n_s = make_note(midi_n, nd, "sawtooth", amp=0.38, attack=0.003, release=0.03)
        place(buf, n_s, int(i * bass16 * SR))

    # Synth stab chord (every 2 beats, quick)
    chord_tones = [root + sc[0], root + sc[2], root + sc[4]]
    stab_step = beat * 2
    for i in range(int(DURATION / stab_step) + 1):
        ch = make_chord(chord_tones, beat * 0.3, wtype=wtype, amp=0.16)
        place(buf, ch, int(i * stab_step * SR))

    # High-octave sparse lead
    lead_pat = [sc[4], sc[7 % len(sc)], sc[4], sc[2]]
    lead_step = beat * 2
    for i in range(int(DURATION / lead_step) + 1):
        midi_n = root + lead_pat[i % len(lead_pat)] + 24
        nd = beat * 0.9
        n_s = make_note(midi_n, nd, "sine", amp=0.12, attack=0.02)
        place(buf, n_s, int(i * lead_step * SR))

    return normalize(apply_fade(buf))


def gen_synth_lead(root, bpm, scale_name, wtype):
    """Clear melody takes center stage over rhythmic backing."""
    beat = 60.0 / bpm
    n = int(DURATION * SR)
    buf = np.zeros(n, dtype=np.float32)
    sc = SCALES[scale_name]

    # Minimal kick — half-time feel
    for i in range(int(DURATION / (beat * 2)) + 1):
        place(buf, make_kick(0.22, amp=0.72), int(i * 2 * beat * SR))

    # Snare on beat 3 of every 4
    for i in range(int(DURATION / beat) + 1):
        if i % 4 == 2:
            place(buf, make_snare(0.16, amp=0.48), int(i * beat * SR))

    # Hi-hat 8th notes
    hat8 = beat / 2
    for i in range(int(DURATION / hat8) + 1):
        h = make_hihat(0.06, amp=0.10)
        place(buf, h, int(i * hat8 * SR))

    # Bass line — quarter notes, mostly root with passing tones
    bass_pat = [sc[0], sc[0], sc[4], sc[3 % len(sc)],
                sc[0], sc[2], sc[4], sc[0]]
    for i in range(int(DURATION / beat) + 1):
        midi_n = root + bass_pat[i % len(bass_pat)] - 12
        nd = beat * 0.88
        n_s = make_note(midi_n, nd, "triangle", amp=0.25, attack=0.006)
        place(buf, n_s, int(i * beat * SR))

    # Lead melody — longer phrase, expressively varying rhythm
    lead_phrase = [
        (sc[4], 1.0), (sc[6 % len(sc)], 0.5), (sc[4], 0.5), (sc[2], 1.0),
        (sc[0], 1.5), (sc[2], 0.5), (sc[4], 1.0), (sc[5 % len(sc)], 0.5),
        (sc[4], 0.5), (sc[2], 1.0), (sc[4], 0.5), (sc[0], 1.5),
    ]
    pos = 0.0
    phrase_len = sum(d for _, d in lead_phrase)
    while pos < DURATION:
        for deg, dur_beats in lead_phrase:
            midi_n = root + deg + 12
            nd = dur_beats * beat * 0.88
            n_s = make_note(midi_n, nd, wtype, amp=0.30, attack=0.008, release=0.08)
            p_s = int(pos * SR)
            place(buf, n_s, p_s)
            pos += dur_beats * beat
            if pos >= DURATION:
                break

    return normalize(apply_fade(buf))


def gen_atmospheric(root, bpm, scale_name, wtype):
    """Slow-evolving pads + steady rhythm — cinematic electronic."""
    beat = 60.0 / bpm
    n = int(DURATION * SR)
    buf = np.zeros(n, dtype=np.float32)
    sc = SCALES[scale_name]

    # Kick on 1 only
    for i in range(int(DURATION / (beat * 4)) + 1):
        place(buf, make_kick(0.22, amp=0.65), int(i * 4 * beat * SR))

    # Hi-hat 8th notes quiet
    hat8 = beat / 2
    for i in range(int(DURATION / hat8) + 1):
        h = make_hihat(0.07, amp=0.07)
        place(buf, h, int(i * hat8 * SR))

    # Chord pads — slow changes every 8 beats
    pad_chords = [
        [root + sc[0], root + sc[4], root + sc[7 % len(sc)]],
        [root + sc[3 % len(sc)], root + sc[5 % len(sc)], root + sc[0] + 12],
        [root + sc[4], root + sc[6 % len(sc)], root + sc[2] + 12],
        [root + sc[2], root + sc[5 % len(sc)], root + sc[7 % len(sc)] + 12],
    ]
    pad_step = beat * 8
    for i in range(int(DURATION / pad_step) + 1):
        ct = pad_chords[i % len(pad_chords)]
        ch = make_chord(ct, pad_step, wtype=wtype, amp=0.20, release=0.5)
        place(buf, ch, int(i * pad_step * SR))

    # Arpeggio over pads — 16th notes
    arp_n = [sc[0], sc[2], sc[4], sc[7 % len(sc)]]
    arp16 = beat / 4
    for i in range(int(DURATION / arp16) + 1):
        midi_n = root + arp_n[i % len(arp_n)] + 12
        nd = arp16 * 0.6
        n_s = make_note(midi_n, nd, "sine", amp=0.14, attack=0.003, release=0.015)
        place(buf, n_s, int(i * arp16 * SR))

    return normalize(apply_fade(buf))


def gen_percussive(root, bpm, scale_name, wtype):
    """Rhythm-first: complex polyrhythmic patterns dominate."""
    beat = 60.0 / bpm
    n = int(DURATION * SR)
    buf = np.zeros(n, dtype=np.float32)
    sc = SCALES[scale_name]

    # Complex kick pattern — Euclidean-inspired
    kick_pat16 = [1,0,0,1,0,0,1,0,0,1,0,1,0,0,1,0]
    step16 = beat / 4
    for i in range(int(DURATION / step16) + 1):
        if kick_pat16[i % len(kick_pat16)]:
            place(buf, make_kick(0.20, amp=0.78), int(i * step16 * SR))

    # Snare pattern
    sn_pat16 = [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1]
    for i in range(int(DURATION / step16) + 1):
        if sn_pat16[i % len(sn_pat16)]:
            place(buf, make_snare(0.15, amp=0.50), int(i * step16 * SR))

    # Open hi-hat (accent)
    hat_pat16 = [0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0]
    for i in range(int(DURATION / step16) + 1):
        if hat_pat16[i % len(hat_pat16)]:
            h = make_hihat(0.12, amp=0.18, bright=True)
            place(buf, h, int(i * step16 * SR))

    # Closed hat every 16th
    for i in range(int(DURATION / step16) + 1):
        if not hat_pat16[i % len(hat_pat16)]:
            h = make_hihat(0.025, amp=0.07, bright=False)
            place(buf, h, int(i * step16 * SR))

    # Rhythmic bass hits
    bass_pat16 = [1,0,0,0,1,0,1,0,0,1,0,0,1,0,0,0]
    for i in range(int(DURATION / step16) + 1):
        if bass_pat16[i % len(bass_pat16)]:
            midi_n = root + sc[0] - 12
            nd = step16 * 0.8
            n_s = make_note(midi_n, nd, "square", amp=0.28, attack=0.003, release=0.02)
            place(buf, n_s, int(i * step16 * SR))

    # Melodic top-line (sparse — every 3 beats)
    mel_notes = [sc[0], sc[4], sc[2], sc[5 % len(sc)], sc[4], sc[0]]
    mel_step = beat * 3
    for i in range(int(DURATION / mel_step) + 1):
        midi_n = root + mel_notes[i % len(mel_notes)] + 12
        nd = beat * 0.7
        n_s = make_note(midi_n, nd, wtype, amp=0.15, attack=0.01)
        place(buf, n_s, int(i * mel_step * SR))

    return normalize(apply_fade(buf))


def gen_chord_stab(root, bpm, scale_name, wtype):
    """Rhythmic chord stabs — dance and house inspired."""
    beat = 60.0 / bpm
    n = int(DURATION * SR)
    buf = np.zeros(n, dtype=np.float32)
    sc = SCALES[scale_name]

    # Kick 4-on-floor
    for i in range(int(DURATION / beat) + 1):
        place(buf, make_kick(0.22, amp=0.82), int(i * beat * SR))

    # Snare 2+4
    for i in range(int(DURATION / beat) + 1):
        if i % 4 in (1, 3):
            place(buf, make_snare(0.16, amp=0.52), int(i * beat * SR))

    # Hi-hat off-beats
    hat8 = beat / 2
    for i in range(int(DURATION / hat8) + 1):
        amp = 0.06 if i % 2 == 0 else 0.13
        h = make_hihat(0.06, amp=amp)
        place(buf, h, int(i * hat8 * SR))

    # Chord stab sequence — 8th-note rhythmic stabs
    chord_seq = [
        [root + sc[0], root + sc[2], root + sc[4]],
        [root + sc[3 % len(sc)], root + sc[5 % len(sc)], root + sc[0] + 12],
        [root + sc[4], root + sc[6 % len(sc)], root + sc[2] + 12],
        [root + sc[5 % len(sc)], root + sc[0] + 12, root + sc[3 % len(sc)] + 12],
    ]
    stab_pat = [1, 0, 1, 1, 0, 1, 0, 1]  # which 8th-notes get a stab
    stab8 = beat / 2
    for i in range(int(DURATION / stab8) + 1):
        if stab_pat[i % len(stab_pat)]:
            ct = chord_seq[(i // 8) % len(chord_seq)]
            nd = stab8 * 0.55
            ch = make_chord(ct, nd, wtype=wtype, amp=0.22)
            place(buf, ch, int(i * stab8 * SR))

    # Bass: root + octave jump
    bass_step = beat
    bass_pat = [sc[0], sc[0], sc[4], sc[2], sc[0], sc[3 % len(sc)], sc[4], sc[0]]
    for i in range(int(DURATION / bass_step) + 1):
        midi_n = root + bass_pat[i % len(bass_pat)] - 12
        nd = bass_step * 0.80
        n_s = make_note(midi_n, nd, "sawtooth", amp=0.28, attack=0.005, release=0.04)
        place(buf, n_s, int(i * bass_step * SR))

    return normalize(apply_fade(buf))


def gen_hybrid(root, bpm, scale_name, wtype):
    """Combines multiple textures — complex, cinematic, layered."""
    beat = 60.0 / bpm
    n = int(DURATION * SR)
    buf = np.zeros(n, dtype=np.float32)
    sc = SCALES[scale_name]
    t_all = np.linspace(0, DURATION, n, endpoint=False)

    # Kick 1 + 3
    for i in range(int(DURATION / beat) + 1):
        if i % 4 in (0, 2):
            place(buf, make_kick(0.22, amp=0.80), int(i * beat * SR))

    # Snare 2 + 4
    for i in range(int(DURATION / beat) + 1):
        if i % 4 in (1, 3):
            place(buf, make_snare(0.15, amp=0.50), int(i * beat * SR))

    # Hi-hat 16th with swing accent
    hat16 = beat / 4
    for i in range(int(DURATION / hat16) + 1):
        amp = 0.12 if i % 4 == 0 else (0.06 if i % 2 == 0 else 0.09)
        h = make_hihat(0.03, amp=amp)
        place(buf, h, int(i * hat16 * SR))

    # Sub bass — whole notes
    sub_freq = midi_to_hz(root + sc[0] - 24)
    sub_raw = np.sin(2 * np.pi * sub_freq * t_all) * 0.22
    buf += sub_raw.astype(np.float32)

    # Bass line 8th notes
    bass_pat = [sc[0], sc[4], sc[0], sc[2], sc[5 % len(sc)], sc[4], sc[2], sc[0]]
    bat8 = beat / 2
    for i in range(int(DURATION / bat8) + 1):
        midi_n = root + bass_pat[i % len(bass_pat)] - 12
        nd = bat8 * 0.85
        n_s = make_note(midi_n, nd, "triangle", amp=0.22, attack=0.004)
        place(buf, n_s, int(i * bat8 * SR))

    # Chord pads — 4-bar
    chord_seq = [
        [root + sc[0], root + sc[4], root + sc[7 % len(sc)]],
        [root + sc[5 % len(sc)], root + sc[0] + 12, root + sc[3 % len(sc)] + 12],
        [root + sc[3 % len(sc)], root + sc[6 % len(sc)], root + sc[2] + 12],
        [root + sc[4], root + sc[7 % len(sc)], root + sc[0] + 12 + 4],
    ]
    pad_step = beat * 4
    for i in range(int(DURATION / pad_step) + 1):
        ct = chord_seq[i % len(chord_seq)]
        ch = make_chord(ct, pad_step, wtype=wtype, amp=0.15, release=0.3)
        place(buf, ch, int(i * pad_step * SR))

    # Arpeggio 16th notes on top
    arp_notes = [root + sc[0] + 12, root + sc[2] + 12, root + sc[4] + 12,
                 root + sc[7 % len(sc)] + 12]
    arp16 = beat / 4
    for i in range(int(DURATION / arp16) + 1):
        midi_n = arp_notes[i % len(arp_notes)]
        nd = arp16 * 0.5
        n_s = make_note(midi_n, nd, "sine", amp=0.12, attack=0.002, release=0.01)
        place(buf, n_s, int(i * arp16 * SR))

    return normalize(apply_fade(buf))


# ── 100 track configurations ────────────────────────────────────────────────
# 10 styles × 10 variations. Each row: (style_fn, root_midi, bpm, scale, waveform)
# root_midi: C4=60, D4=62, E4=64, F4=65, G4=67, A4=69, Bb=70, B4=71,
#            C#4=61, Eb4=63, F#4=66, Ab4=68

STYLE_FNS = [
    gen_driving,    # styles 1-10
    gen_arpeggio,   # styles 11-20
    gen_pulse,      # styles 21-30
    gen_staccato,   # styles 31-40
    gen_bass_heavy, # styles 41-50
    gen_synth_lead, # styles 51-60
    gen_atmospheric,# styles 61-70
    gen_percussive, # styles 71-80
    gen_chord_stab, # styles 81-90
    gen_hybrid,     # styles 91-100
]

TRACK_CONFIGS = [
    # (root_midi, bpm, scale, waveform)
    # ── DRIVING (1-10) ──────────────────────────────────────────
    (57, 135, "minor",      "sawtooth"),   # 001 Am 135bpm
    (60, 142, "dorian",     "square"),     # 002 C dorian 142bpm
    (62, 148, "minor",      "sawtooth"),   # 003 Dm 148bpm
    (65, 140, "phrygian",   "square"),     # 004 F phrygian 140bpm
    (67, 155, "minor",      "soft"),       # 005 Gm 155bpm
    (64, 138, "dorian",     "sawtooth"),   # 006 Em dorian 138bpm
    (61, 162, "minor",      "square"),     # 007 C#m 162bpm
    (68, 145, "mixolydian", "soft"),       # 008 Ab mixolydian 145bpm
    (70, 152, "minor",      "sawtooth"),   # 009 Bbm 152bpm
    (66, 168, "dorian",     "square"),     # 010 F# dorian 168bpm

    # ── ARPEGGIO (11-20) ────────────────────────────────────────
    (60, 130, "major",      "sine"),       # 011 C major 130bpm
    (62, 138, "major",      "triangle"),   # 012 D major 138bpm
    (64, 125, "lydian",     "sine"),       # 013 E lydian 125bpm
    (67, 145, "major",      "harmonic"),   # 014 G major 145bpm
    (69, 140, "pentatonic", "sine"),       # 015 A pentatonic 140bpm
    (65, 132, "major",      "triangle"),   # 016 F major 132bpm
    (71, 155, "lydian",     "sine"),       # 017 B lydian 155bpm
    (63, 148, "major",      "harmonic"),   # 018 Eb major 148bpm
    (66, 135, "pentatonic", "triangle"),   # 019 F# pentatonic 135bpm
    (68, 162, "major",      "sine"),       # 020 Ab major 162bpm

    # ── PULSE (21-30) ───────────────────────────────────────────
    (57, 128, "minor",      "soft"),       # 021 Am 128bpm
    (60, 136, "dorian",     "square"),     # 022 C dorian 136bpm
    (64, 144, "phrygian",   "soft"),       # 023 Em phrygian 144bpm
    (62, 130, "minor",      "sawtooth"),   # 024 Dm 130bpm
    (67, 152, "mixolydian", "soft"),       # 025 G mixolydian 152bpm
    (70, 140, "minor",      "square"),     # 026 Bbm 140bpm
    (65, 135, "dorian",     "soft"),       # 027 F dorian 135bpm
    (69, 158, "minor",      "sawtooth"),   # 028 Am 158bpm
    (61, 128, "phrygian",   "soft"),       # 029 C# phrygian 128bpm
    (66, 145, "mixolydian", "square"),     # 030 F# mixolydian 145bpm

    # ── STACCATO (31-40) ────────────────────────────────────────
    (60, 140, "major",      "harmonic"),   # 031 C major 140bpm
    (62, 148, "minor",      "square"),     # 032 Dm 148bpm
    (64, 155, "dorian",     "harmonic"),   # 033 Em dorian 155bpm
    (67, 138, "major",      "square"),     # 034 G major 138bpm
    (57, 162, "minor",      "sawtooth"),   # 035 Am 162bpm
    (65, 145, "lydian",     "harmonic"),   # 036 F lydian 145bpm
    (69, 142, "major",      "square"),     # 037 Am/A major 142bpm
    (63, 168, "phrygian",   "sawtooth"),   # 038 Eb phrygian 168bpm
    (71, 135, "minor",      "harmonic"),   # 039 Bm 135bpm
    (68, 158, "dorian",     "square"),     # 040 Ab dorian 158bpm

    # ── BASS HEAVY (41-50) ──────────────────────────────────────
    (57, 125, "minor",      "sawtooth"),   # 041 Am 125bpm
    (60, 132, "blues",      "sawtooth"),   # 042 C blues 132bpm
    (64, 140, "minor",      "soft"),       # 043 Em 140bpm
    (62, 128, "blues",      "square"),     # 044 Dm blues 128bpm
    (67, 148, "minor",      "sawtooth"),   # 045 Gm 148bpm
    (65, 130, "dorian",     "soft"),       # 046 F dorian 130bpm
    (70, 155, "blues",      "sawtooth"),   # 047 Bb blues 155bpm
    (61, 138, "minor",      "square"),     # 048 C#m 138bpm
    (66, 145, "blues",      "soft"),       # 049 F# blues 145bpm
    (68, 135, "minor",      "sawtooth"),   # 050 Abm 135bpm

    # ── SYNTH LEAD (51-60) ──────────────────────────────────────
    (60, 128, "major",      "triangle"),   # 051 C major 128bpm
    (62, 135, "dorian",     "soft"),       # 052 D dorian 135bpm
    (64, 142, "major",      "harmonic"),   # 053 E major 142bpm
    (67, 130, "mixolydian", "triangle"),   # 054 G mixolydian 130bpm
    (65, 148, "major",      "soft"),       # 055 F major 148bpm
    (69, 138, "dorian",     "harmonic"),   # 056 A dorian 138bpm
    (57, 155, "minor",      "triangle"),   # 057 Am 155bpm
    (71, 128, "major",      "soft"),       # 058 B major 128bpm
    (63, 145, "mixolydian", "harmonic"),   # 059 Eb mixolydian 145bpm
    (66, 135, "major",      "triangle"),   # 060 F# major 135bpm

    # ── ATMOSPHERIC (61-70) ─────────────────────────────────────
    (57, 120, "minor",      "soft"),       # 061 Am 120bpm
    (60, 125, "dorian",     "harmonic"),   # 062 C dorian 125bpm
    (64, 122, "phrygian",   "soft"),       # 063 Em phrygian 122bpm
    (62, 128, "minor",      "harmonic"),   # 064 Dm 128bpm
    (67, 120, "lydian",     "soft"),       # 065 G lydian 120bpm
    (65, 125, "minor",      "harmonic"),   # 066 Fm 125bpm
    (70, 122, "dorian",     "soft"),       # 067 Bb dorian 122bpm
    (69, 128, "phrygian",   "harmonic"),   # 068 Am phrygian 128bpm
    (61, 120, "minor",      "soft"),       # 069 C#m 120bpm
    (68, 125, "lydian",     "harmonic"),   # 070 Ab lydian 125bpm

    # ── PERCUSSIVE (71-80) ──────────────────────────────────────
    (57, 150, "minor",      "square"),     # 071 Am 150bpm
    (60, 158, "dorian",     "sawtooth"),   # 072 C dorian 158bpm
    (62, 145, "minor",      "square"),     # 073 Dm 145bpm
    (64, 162, "phrygian",   "sawtooth"),   # 074 Em phrygian 162bpm
    (67, 148, "minor",      "square"),     # 075 Gm 148bpm
    (65, 155, "blues",      "sawtooth"),   # 076 Fm blues 155bpm
    (70, 165, "minor",      "square"),     # 077 Bbm 165bpm
    (69, 142, "dorian",     "sawtooth"),   # 078 Am dorian 142bpm
    (63, 158, "phrygian",   "square"),     # 079 Eb phrygian 158bpm
    (66, 148, "minor",      "sawtooth"),   # 080 F#m 148bpm

    # ── CHORD STAB (81-90) ──────────────────────────────────────
    (60, 130, "major",      "soft"),       # 081 C major 130bpm
    (62, 138, "dorian",     "harmonic"),   # 082 D dorian 138bpm
    (64, 145, "major",      "soft"),       # 083 E major 145bpm
    (67, 132, "mixolydian", "harmonic"),   # 084 G mixolydian 132bpm
    (57, 148, "minor",      "soft"),       # 085 Am 148bpm
    (65, 140, "major",      "harmonic"),   # 086 F major 140bpm
    (69, 135, "dorian",     "soft"),       # 087 A dorian 135bpm
    (71, 155, "major",      "harmonic"),   # 088 B major 155bpm
    (63, 142, "mixolydian", "soft"),       # 089 Eb mixolydian 142bpm
    (68, 130, "major",      "harmonic"),   # 090 Ab major 130bpm

    # ── HYBRID (91-100) ─────────────────────────────────────────
    (57, 140, "minor",      "soft"),       # 091 Am hybrid 140bpm
    (60, 148, "dorian",     "harmonic"),   # 092 C dorian hybrid 148bpm
    (62, 135, "minor",      "triangle"),   # 093 Dm hybrid 135bpm
    (64, 155, "lydian",     "soft"),       # 094 Em lydian hybrid 155bpm
    (67, 142, "mixolydian", "harmonic"),   # 095 G mixolydian hybrid 142bpm
    (65, 158, "minor",      "triangle"),   # 096 Fm hybrid 158bpm
    (70, 130, "dorian",     "soft"),       # 097 Bb dorian hybrid 130bpm
    (66, 165, "phrygian",   "harmonic"),   # 098 F# phrygian hybrid 165bpm
    (61, 145, "minor",      "triangle"),   # 099 C#m hybrid 145bpm
    (68, 138, "mixolydian", "soft"),       # 100 Ab mixolydian hybrid 138bpm
]

assert len(TRACK_CONFIGS) == 100, f"Expected 100 configs, got {len(TRACK_CONFIGS)}"

# ── Main ────────────────────────────────────────────────────────────────────

def main():
    np.random.seed(42)  # reproducible percussion noise

    start_from = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    end_at     = int(sys.argv[2]) if len(sys.argv) > 2 else 100

    print(f"Generating BGM tracks {start_from}–{end_at} …")

    for idx in range(start_from - 1, end_at):
        track_num = idx + 1
        style_fn  = STYLE_FNS[idx // 10]
        root, bpm, scale, wtype = TRACK_CONFIGS[idx]

        print(f"[{track_num:3d}/100] style={style_fn.__name__:18s} "
              f"root={root:3d}  bpm={bpm:3d}  scale={scale:12s}  wave={wtype}")

        try:
            mono = style_fn(root, bpm, scale, wtype)
            stereo = to_stereo(mono)
            save_mp3(stereo, track_num)
        except Exception as e:
            print(f"  ERROR on track {track_num}: {e}", file=sys.stderr)
            raise

    print(f"\nDone. {end_at - start_from + 1} tracks saved to {OUT_DIR}/")

if __name__ == "__main__":
    main()
