class EvidenceBoard:
    def __init__(self):
        self.clues_found = set()
        self.suspect_statements = {}
        self.notes = []
        self.pin_cracked = False

    def add_clue(self, clue_name):
        before = len(self.clues_found)
        self.clues_found.add(clue_name)
        return len(self.clues_found) > before

    def has_clue(self, clue_name):
        return clue_name in self.clues_found

    def log_answer(self, character, question_key, answer, truth):
        self.suspect_statements.setdefault(character, {})[question_key] = {
            "answer": answer,
            "truth": truth,
        }

    def add_note(self, note):
        note = str(note).strip()
        if not note:
            return False
        self.notes.append(note)
        return True

    def set_pin_cracked(self):
        self.pin_cracked = True

    def summary(self):
        return {
            "clues_found": sorted(self.clues_found),
            "statements": self.suspect_statements,
            "notes": list(self.notes),
            "pin_cracked": self.pin_cracked,
        }
