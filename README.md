# ZOM-MOLE HUNTER — Python + HTML/CSS

No Streamlit. Python owns the game state and Zephyr's utility-based agent; the browser provides the dossier-style frontend.

## Run locally

```bash
cd zom_mole_python_web
python app.py
```

Open `http://127.0.0.1:8000`.

## Game logic
- At the start, the player chooses Easy or Hard mode. Hard guarantees the TT evidence state; Easy randomly selects one of TF, FT, or FF.
- The Restricted Terminal code is assembled from the Laboratory, Storage, and Cafeteria clues: 4 + 6 + 19 = 4619.
- After the PIN is verified, the security decision is **Simple Reflex**, using only the three-state percept inputs required by the model: Storage evidence, Cafeteria evidence, and Security status.
- **Hard Mode:** Storage evidence AND Cafeteria evidence are both found -> Wordle security activates.
- **Easy Mode:** the three non-TT Storage/Cafeteria combinations are used once each in a random shuffle-bag order, then reshuffled for the next cycle. Wordle is skipped, and the correct PIN always recovers the subtle audit clue.
- The agent's full decision-state space is `2^3 = 8` combinations of Storage T/F × Cafeteria T/F × Security Failed T/F. In Easy Mode, the terminal check supplies the final T/F state; in Hard Mode, Wordle supplies it.
- During interrogation, Zephyr uses the **utility-based** truth-vs-lie decision. `security_failed` is the third binary state used by the utility model; `wordle_failed` is retained only as a gameplay/history record. Interrogation is always open; accusation unlocks after every suspect has been questioned.
- Raw utility scores are not shown to the player.
- The detective/player enters a name at the start; it appears on interrogation transcripts.
- There is no suspicion meter.
- Open a New Case creates a fresh Python `GameState`; Easy mode advances the player's shuffle bag, while Hard mode always creates TT.

## Deploy on PythonAnywhere

1. Push this folder to GitHub. Do not commit `__pycache__` or secrets.
2. In PythonAnywhere, open a Bash console and clone the repository:

	```bash
	git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
	cd YOUR_REPOSITORY
	python3.11 -m venv .venv
	source .venv/bin/activate
	pip install -r requirements.txt
	```

3. Open the **Web** tab, choose **Add a new web app**, select **Manual configuration**, and choose the same Python version.
4. Set the source directory to the cloned folder and the virtualenv to its `.venv` path.
5. Open the WSGI configuration file and replace its contents with:

   ```python
   import sys

   project = "/home/YOUR_USERNAME/YOUR_REPOSITORY"
   if project not in sys.path:
	   sys.path.insert(0, project)

   from app import app as application
   ```

6. Reload the web app. The public URL will be `https://YOUR_USERNAME.pythonanywhere.com`.

The Flask app in `app.py` is used for both local development and PythonAnywhere deployment.

## Publish through itch.io

The game needs Python to keep each player's game state, so do not upload only `index.html` as a standalone itch.io HTML5 game. First deploy it on PythonAnywhere, then create an itch.io project page and add the PythonAnywhere URL as the game's external play link. Players can launch it in their browser from itch.io.

For a native itch.io embed, the backend must also be hosted somewhere that allows cross-origin requests and credentials; the PythonAnywhere URL is the simplest reliable option for this project.
