import random
from ai_agent import MoleAI
from evidence import EvidenceBoard
import case

ROOMS = list(case.ROOMS)
WORDLE_ANSWER = case.WORDLE_ANSWER
WORDLE_MAX_ATTEMPTS = 6


class GameState:
    """Authoritative state for one investigation run."""

    def __init__(self, seed=None, mode="EASY", easy_outcome=None):
        self.rng = random.Random(seed)
        self.mole_ai = MoleAI(seed)
        self.evidence = EvidenceBoard()

        self.actions_used = 0
        self.visited_rooms = {}
        self.room_decisions = {}
        self.asked = {}
        self.log = []
        self.game_over = False
        self.result = None
        self.accused = None
        self.contradiction_flagged = False

        self.detective_name = "Detective"

        self.pin_cracked = False
        self.pin_attempts = 0

        self.security_challenge_active = False
        self.security_challenge_complete = False
        self.security_failed = False
        self.security_clue_found = False
        self.security_mode = "EASY"
        self.selected_mode = None
        self.wordle_answer = WORDLE_ANSWER
        self.wordle_attempts = []
        self.wordle_failed = False
        self.wordle_results = []

        self.storage_riddle_solved = False
        self.storage_evidence_found = False

        self.storage_roll = False
        self.cafeteria_roll = False
        self.cafeteria_evidence_found = False
        self.set_mode(mode, easy_outcome=easy_outcome)

    def set_mode(self, mode, easy_outcome=None):
        selected = str(mode or "").strip().upper()
        if selected not in {"EASY", "HARD"}:
            return False, "Choose Easy or Hard mode."

        self.selected_mode = selected
        if selected == "HARD":
            self.storage_roll = True
            self.cafeteria_roll = True
        elif easy_outcome is not None:
            self.storage_roll, self.cafeteria_roll = easy_outcome
        else:
            self.storage_roll, self.cafeteria_roll = self.rng.choice(
                [(False, False), (False, True), (True, False)]
            )
        return True, selected

    def can_act(self):
        return not self.game_over

    def _log(self, text):
        self.log.append(text)

    def _reveal_security_clue(self):
        if self.security_clue_found:
            return
        self.security_clue_found = True
        self.evidence.add_note(
            "Terminal audit: an inventory movement session opened at 11:50 PM "
            "and closed at 11:53 PM. Filtration stock discrepancy: 6 units. "
            "Operator field corrupted."
        )
        self._log("Partial terminal audit recovered: six filtration units are unaccounted for.")

    def set_detective_name(self, name):
        cleaned = " ".join(str(name or "").strip().split())
        if not cleaned:
            return False, "Enter a detective name."
        if len(cleaned) > 32:
            return False, "Detective name must be 32 characters or fewer."

        self.detective_name = cleaned
        self._log(f"Detective assigned: {cleaned}.")
        return True, cleaned

    def visit_room(self, room):
        if not self.can_act():
            return False, "The case is already closed."

        if room in self.visited_rooms:
            return False, f"You've already investigated the {room}."

        if room not in ROOMS:
            return False, "Unknown room."

        if room == "Laboratory":
            clue = case.LAB_CLUE
            self.evidence.add_clue("lab_acrostic")
            self.room_decisions[room] = "neutral"

        elif room == "Storage":
            clue = case.STORAGE_CLUE
            self.room_decisions[room] = "awaiting_riddle"

        else:
            # The cafe clue has two equally valid environmental outcomes.
            # Both preserve the PIN fragment 19 so the case remains solvable.
            self.cafeteria_evidence_found = self.cafeteria_roll
            clue = (
                case.CAFETERIA_CLUE_FOUND
                if self.cafeteria_evidence_found
                else case.CAFETERIA_CLUE_PARTIAL
            )
            if self.cafeteria_evidence_found:
                self.evidence.add_clue("cafeteria_pin")
                self.room_decisions[room] = "full_evidence"
            else:
                self.room_decisions[room] = "partial_evidence"

        self.visited_rooms[room] = clue
        self.actions_used += 1
        self._log(f"Investigated the {room}.")

        return True, clue

    def solve_storage_riddle(self, answer):
        if "Storage" not in self.visited_rooms:
            return False, "Investigate Storage first."

        if self.storage_riddle_solved:
            return (
                True,
                "FOUND" if self.storage_evidence_found else "NOT_FOUND"
            )

        if str(answer).strip().upper() != case.STORAGE_ANSWER:
            self.actions_used += 1
            self._log("Incorrect Storage riddle answer.")
            return False, "Incorrect answer. Try again."

        self.storage_riddle_solved = True
        self.actions_used += 1

        self.storage_evidence_found = self.storage_roll

        if self.storage_evidence_found:
            self.evidence.add_clue("storage_ventilation")
            self.room_decisions["Storage"] = "evidence_found"
            self._log("Ventilation override found in Storage.")
            return True, "FOUND"

        self.room_decisions["Storage"] = "evidence_not_found"
        self._log("Storage search completed; no ventilation override recovered.")
        return True, "NOT_FOUND"

    def attempt_pin(self, guess):
        if self.pin_cracked:
            return True, "ALREADY_CRACKED"

        if not self.can_act():
            return False, "The case is already closed."

        # The terminal is intentionally built from all three room clues.
        if not all(room in self.visited_rooms for room in ROOMS):
            return False, "Investigate the Laboratory, Storage, and Cafeteria first."

        if not self.storage_riddle_solved:
            return False, "Solve the Storage riddle first."

        self.actions_used += 1
        self.pin_attempts += 1

        digits = "".join(ch for ch in str(guess) if ch.isdigit())

        if digits != case.CORRECT_PIN:
            self.security_mode = "EASY"
            self.security_challenge_active = False
            self.security_challenge_complete = True
            self.security_failed = True
            self._log(f"Incorrect PIN attempt #{self.pin_attempts}.")
            self._log("Security challenge failed; security is marked FAILED.")
            return False, "Incorrect PIN."

        self.pin_cracked = True
        self.evidence.set_pin_cracked()
        self._log("PIN cracked. Restricted employee access unlocked.")

        # Decision 1 is deliberately a SIMPLE REFLEX rule.
        # Hard Mode is used only when both physical evidence sources were found.
        # Easy Mode resolves a separate terminal check without Wordle.
        self.security_failed = False
        self.security_clue_found = False
        self._reveal_security_clue()
        hard_mode = self.mole_ai.decide_security_sabotage(self)
        if hard_mode:
            self.security_mode = "HARD"
            self.security_challenge_active = True
            self.security_challenge_complete = False
            self._log("Reflex rule: Storage + Cafeteria evidence found -> HARD MODE security activated.")
        else:
            self.security_mode = "EASY"
            self.security_challenge_active = False
            self.security_challenge_complete = True
            self.security_failed = self.rng.choice([False, True])
            if self.security_failed:
                self._log("Reflex rule: non-TT evidence state -> EASY MODE; secondary check failed, but interrogation remains available.")
            else:
                self._log("Reflex rule: non-TT evidence state -> EASY MODE; terminal check passed and an audit clue was recovered.")

        return True, "CORRECT"

    def submit_wordle(self, guess):
        if not self.security_challenge_active:
            return False, "No security challenge is active."

        guess = str(guess).strip().upper()

        if len(guess) != 5 or not guess.isalpha():
            return False, "Enter a 5-letter word."

        if len(self.wordle_attempts) >= WORDLE_MAX_ATTEMPTS:
            self.security_challenge_active = False
            self.wordle_failed = True
            self.security_failed = True
            self.security_challenge_complete = True
            self._log("Security challenge exhausted; security is marked FAILED and the episode is over.")
            return False, "ATTEMPTS_EXHAUSTED"

        self.wordle_attempts.append(guess)

        answer = self.wordle_answer
        result = ["black"] * 5
        remaining = {}

        for ch in answer:
            remaining[ch] = remaining.get(ch, 0) + 1

        for i, ch in enumerate(guess):
            if ch == answer[i]:
                result[i] = "green"
                remaining[ch] -= 1

        for i, ch in enumerate(guess):
            if result[i] == "green":
                continue

            if remaining.get(ch, 0) > 0:
                result[i] = "yellow"
                remaining[ch] -= 1

        self.wordle_results.append({"guess": guess, "result": list(result)})

        if guess == answer:
            self.security_challenge_complete = True
            self.security_challenge_active = False
            self.security_failed = False
            self._reveal_security_clue()
            self._log("Secondary security lock defeated; security is marked COMPLETED.")

            return True, {
                "status": "CORRECT",
                "result": result,
                "attempts_remaining": WORDLE_MAX_ATTEMPTS - len(self.wordle_attempts),
            }

        if len(self.wordle_attempts) >= WORDLE_MAX_ATTEMPTS:
            # Losing the Wordle still completes the security episode.
            # The player is allowed to continue to interrogation, and
            # security_failed becomes the third binary input to the mole's utility rule.
            self.security_challenge_active = False
            self.wordle_failed = True
            self.security_failed = True
            self.security_challenge_complete = True

            self._log(
                "Security challenge failed; security is marked FAILED. "
                "Interrogation access is now available."
            )

            return True, {
                "status": "FAILED",
                "result": result,
                "attempts_remaining": 0,
            }

        return True, {
            "status": "CONTINUE",
            "result": result,
            "attempts_remaining": WORDLE_MAX_ATTEMPTS - len(self.wordle_attempts),
        }

    def ask_question(self, character, question_key="alibi"):
        if not self.can_act():
            return False, "The case is already closed."

        if character in self.asked:
            return False, f"You've already questioned {character}."

        if character not in case.CHARACTERS:
            return False, "Unknown character."

        if character == case.MOLE:
            # Only this decision is utility-based.
            tell_truth = self.mole_ai.decide_truth_or_lie(self)
            data = case.ANSWERS[character][question_key]

            answer = (
                data.get("truth_answer")
                if tell_truth
                else data.get("lie_answer")
            )
            lied = not tell_truth
        else:
            answer = case.ANSWERS[character][question_key]["answer"]
            lied = False

        self.asked[character] = {
            "question": question_key,
            "answer": answer,
            "lied": lied,
        }

        self.evidence.log_answer(
            character,
            question_key,
            answer,
            not lied,
        )
        self.evidence.add_note(f'{character}: "{answer}"')

        self.actions_used += 1
        self._log(f"Questioned {character}.")

        return True, answer

    def make_accusation(self, character, reasoning=""):
        if self.game_over:
            return False, "The case is already closed."

        if character not in case.CHARACTERS:
            return False, "Unknown character."

        if not all(name in self.asked for name in case.CHARACTERS):
            return False, "Question every suspect before making an accusation."

        self.accused = character
        self.game_over = True
        self.result = "win" if character == case.MOLE else "lose"

        self._log(f"Final accusation: {character}.")
        return True, self.result

    def get_stats(self):
        return {
            "actions_used": self.actions_used,
            "result": self.result,
            "accused": self.accused,
            "detective_name": self.detective_name,
            "pin_cracked": self.pin_cracked,
            "pin_attempts": self.pin_attempts,
            "storage_evidence_found": self.storage_evidence_found,
            "cafeteria_evidence_found": self.cafeteria_evidence_found,
            "security_challenge_active": self.security_challenge_active,
            "security_challenge_complete": self.security_challenge_complete,
            "security_failed": self.security_failed,
            "security_clue_found": self.security_clue_found,
            "security_mode": self.security_mode,
            "selected_mode": self.selected_mode,
            "wordle_failed": self.wordle_failed,
            "wordle_attempts": list(self.wordle_attempts),
            "wordle_results": list(self.wordle_results),
            "mole_ai": self.mole_ai.stats(),
            "statements": self.evidence.suspect_statements,
            "notes": list(self.evidence.notes),
        }
