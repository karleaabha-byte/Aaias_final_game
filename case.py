CHARACTERS = ["Raven", "Zephyr", "Luca", "Marinette", "Adrien"]
MOLE = "Zephyr"
ROOMS = ["Laboratory", "Storage", "Cafeteria"]

LAB_NUMBER = 4
STORAGE_ANSWER = "BREEZE"
STORAGE_NUMBER = len(STORAGE_ANSWER)
CAFE_PIN_FRAGMENT = "19"
CORRECT_PIN = f"{LAB_NUMBER}{STORAGE_NUMBER}{CAFE_PIN_FRAGMENT}"

QUESTION_BANK = {"alibi": "Where were you at 11:50 PM?"}

CASE_INTRO = """12:18 AM.

The research facility should have been asleep. Instead, the emergency lights are flashing, a laboratory alarm is screaming through the corridors, and six experimental filter cartridges have disappeared from Storage.

A centrifuge stopped unexpectedly. A vial was found broken. And three minutes of corridor camera footage are missing.

Five employees were still inside the facility. Someone is lying.

Your job is to find out whose lie matters."""

BACKGROUND = {
    "THE CASE": [
        ("12:10 AM", "The emergency alarm sounded after the Laboratory centrifuge stopped unexpectedly."),
        ("12:14 AM", "Six filter cartridges were found missing from Storage."),
        ("12:18 AM", "Three minutes of corridor camera footage were missing."),
    ],
    "THE TIMELINE": [
        ("11:49 PM", "Corridor cameras went offline."),
        ("11:50 PM", "Cafeteria Machine #3 began an unscheduled restock."),
        ("11:52 PM", "The Laboratory centrifuge was manually interrupted."),
    ],
    "THE PEOPLE": [
        ("RAVEN", "Head Chemist — responsible for the Laboratory."),
        ("ZEPHYR", "Supply Coordinator — responsible for Storage and supplies."),
        ("LUCA", "Security Officer — responsible for cameras and patrols."),
        ("MARINETTE", "Medic — responsible for the Medical Bay."),
        ("ADRIEN", "Engineer — responsible for facility power systems."),
    ],
    "ONE IMPORTANT DETAIL": [
        ("VENT", "The Storage ventilation override can only be used by Supply and Maintenance. Maintenance is out right now."),
    ],
}

PROFILES = {
    "Raven": {"role": "Head Chemist", "location": "Laboratory", "description": "Brilliant, impatient and visibly annoyed that anyone would question her work.", "personality": "Defensive but confident."},
    "Zephyr": {"role": "Supply Coordinator", "location": "Storage", "description": "Quiet, organized and almost painfully calm. He knows where everything in the facility is kept.", "personality": "Helpful, controlled and evasive."},
    "Luca": {"role": "Security Officer", "location": "Corridor Patrol", "description": "Takes security seriously, but is clearly embarrassed that the camera outage happened on his watch.", "personality": "Professional and guarded."},
    "Marinette": {"role": "Medic", "location": "Medical Bay", "description": "Friendly and observant. She notices more than she initially admits.", "personality": "Kind but cautious."},
    "Adrien": {"role": "Engineer", "location": "Generator Room", "description": "Usually relaxed, but was dealing with a brief power fluctuation that night.", "personality": "Casual and slightly nervous."},
}

ANSWERS = {
    "Raven": {"alibi": {"answer": "In the Laboratory. I was working with the centrifuge. It stopped a couple of minutes later.", "truth": True}},
    "Zephyr": {"alibi": {
        "answer": "In Storage. I was checking the filter inventory. I didn't think anything was wrong.",
        "truth_answer": "In Storage. I was checking the filter inventory. I didn't think anything was wrong.",
        "lie_answer": "I was in the Cafeteria restocking during the cycle. I never went near Storage.",
        "truth": True,
    }},
    "Luca": {"alibi": {"answer": "Near the west corridor. The cameras had just gone down, so I was checking the security panel.", "truth": True}},
    "Marinette": {"alibi": {"answer": "In the Medical Bay, preparing the emergency kit. I heard the alarm a little later.", "truth": True}},
    "Adrien": {"alibi": {"answer": "In the Generator Room. I was handling a brief power fluctuation.", "truth": True}},
}

LAB_CLUE = {
    "title": "LABORATORY INCIDENT NOTE",
    "lines": [
        "Filter pressure was stable before midnight.",
        "One centrifuge cycle was interrupted manually.",
        "Up and active Raven's workstation.",
        "Recorded interruption at 11:52 PM.",
    ],
    "answer": "FOUR",
    "note": "The first letters spell FOUR. That gives you the first PIN digit: 4.",
}

STORAGE_CLUE = {
    "riddle": [
        "I cannot be seen, but I shake every leaf.",
        "I fill the sails of ships, yet I weigh nothing at all.",
        "I can carry a whisper farther than the person who spoke it.",
        "Sailors welcome me when I am gentle, but fear what I become when I grow wild.",
    ],
    "question": "What am I?",
}

# The environmental cafe outcome is random (p=0.5). Both variants still expose
# the PIN fragment 19, so the four evidence combinations remain playable.
CAFETERIA_CLUE_FOUND = {
    "title": "RESTOCKING LOG — MACHINE #3",
    "job": "ZEPHYR — SUPPLY",
    "pin_fragment": "19",
    "note": (
        "Restocking began at 11:50 PM — during the camera blackout. "
        "Machine #3 is fully automated and requires no employee to operate "
        "during a restocking cycle."
    ),
}

CAFETERIA_CLUE_PARTIAL = {
    "title": "RECOVERED PIN FRAGMENT — MACHINE #3",
    "job": "SUPPLY SHIFT LOG",
    "pin_fragment": "??19",
    "note": "The trailing PIN fragment 19 remains legible.",
}

# Backward-compatible name used by older frontend code.
CAFETERIA_CLUE = CAFETERIA_CLUE_FOUND

WORDLE_ANSWER = "VENTS"
