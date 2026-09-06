"""Hybrid adversarial agent for the mole, Zephyr.

Decision 1: Simple Reflex
    Once the restricted PIN is verified, activate the secondary security
    episode. No utility calculation is used.

Decision 2: Utility Based
    When Zephyr is questioned, score truth vs. lie from the current state
    and choose the higher-utility action. Ties are broken randomly.
"""

import random


class MoleAI:

    def __init__(self, seed=None):
        self.rng = random.Random(seed)
        self.truth_count = 0
        self.lie_count = 0
        self.security_sabotage_count = 0
        self.security_skip_count = 0

    def _state_features(self, state):
        return (
            bool(getattr(state, "storage_evidence_found", False)),
            bool(getattr(state, "cafeteria_evidence_found", False)),
            bool(getattr(state, "security_failed", False)),
            bool(getattr(state, "contradiction_flagged", False)),
        )

    def _utility(self, state, action):
        """Utility for Zephyr's truth/lie decision.

        The PPT's 8-state table is the authoritative mapping:
        Storage T/F x Cafeteria T/F x Security Failed T/F.
        The numeric utilities and selected action are preserved exactly.
        """
        storage, cafe, security_failed, _contrad = self._state_features(state)

        table = {
            (False, False, False): (23, 17),
            (False, False, True): (53, 77),
            (False, True, False): (18, 12),
            (False, True, True): (48, 72),
            (True, False, False): (-47, -61),
            (True, False, True): (-17, -1),
            (True, True, False): (-112, -116),
            (True, True, True): (-82, -56),
        }

        truth_score, lie_score = table[(storage, cafe, security_failed)]
        return truth_score if action == "truth" else lie_score

    def decide_security_sabotage(self, game_state):
        """Simple-reflex security mode decision.

        IF Storage evidence AND Cafeteria evidence -> Hard Mode (Wordle).
        ELSE -> Easy Mode (security completes without Wordle).
        No utilities are computed for this decision.
        """
        hard_mode = (
            bool(getattr(game_state, "storage_evidence_found", False))
            and bool(getattr(game_state, "cafeteria_evidence_found", False))
        )
        if hard_mode:
            self.security_sabotage_count += 1
        else:
            self.security_skip_count += 1
        return hard_mode

    def decide_truth_or_lie(self, game_state):
        """Utility-based choice between truth and lying."""
        candidates = [
            (self._utility(game_state, action), action)
            for action in ("truth", "lie")
        ]

        best_score = max(score for score, _ in candidates)
        best_actions = [
            action for score, action in candidates if score == best_score
        ]
        action = self.rng.choice(best_actions)

        if action == "truth":
            self.truth_count += 1
        else:
            self.lie_count += 1

        return action == "truth"

    def stats(self):
        return {
            "truth_count": self.truth_count,
            "lie_count": self.lie_count,
            "security_sabotage_count": self.security_sabotage_count,
            "security_skip_count": self.security_skip_count,
        }
