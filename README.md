# 🧟 ZOM-MOLE HUNTER

### A Simple Reflex + Utility-Based Agentic Mystery Game

**Zom-Mole Hunter** is an interactive detective game where the player investigates a laboratory sabotage case, questions suspects, gathers evidence, solves a restricted-terminal security challenge, and ultimately identifies the mole.

The game demonstrates **two AI agent approaches within the same game**:

* 🔐 **Simple Reflex Agent** — Zephyr's security decision is determined directly from the current percepts.
* 🧠 **Utility-Based Agent** — Zephyr evaluates the utility of telling the truth versus lying during interrogation.

The frontend uses **HTML/CSS**, while **Python + Flask** manages the game state and AI logic.

---

## 🎮 Game Overview

A mysterious sabotage has occurred inside the laboratory.

Five suspects are involved:

* **Raven**
* **Zephyr**
* **Luca**
* **Marinette**
* **Adrien**

As the detective, you must:

1. Investigate the available evidence.
2. Question each suspect.
3. Recover clues from the Laboratory, Storage, and Cafeteria.
4. Access the Restricted Terminal.
5. Complete the security challenge when required.
6. Analyze the suspects' responses.
7. Accuse the mole before the case closes.

The detective's name is entered at the beginning of the game and appears throughout interrogation transcripts.

There is **no suspicion meter**; the player must reason from the evidence and interrogation responses.

---

## 🤖 AI Agent Architecture

The game combines two different agent models.

### 1. Simple Reflex Agent — Security Decision

After the Restricted Terminal PIN is verified, the security system makes a decision using only its current percepts:

| Percept            | Possible Values     |
| ------------------ | ------------------- |
| Storage Evidence   | True / False        |
| Cafeteria Evidence | True / False        |
| Security Status    | Failed / Not Failed |

This gives the agent:

**2³ = 8 possible percept combinations**

The security decision depends only on the **current state**, making this component a **Simple Reflex Agent**.

The agent does not use previous interrogation history to make this security decision.

---

### 2. Utility-Based Agent — Zephyr's Interrogation

During interrogation, Zephyr uses a **utility-based decision process** to determine whether to tell the truth or lie.

The utility model considers the current game state, including:

* Storage evidence
* Cafeteria evidence
* Security failure status

The agent compares the utility of the available responses and selects the more useful action.

The raw utility scores are intentionally **hidden from the player**.

Importantly, the lie is not simply hard-coded as:

> "If condition X, Zephyr lies."

Instead, the response emerges from the **relative utility of the available choices**. Changing the underlying utility values can therefore change the agent's behavior.

`wordle_failed` is retained as a gameplay/history variable but is **not** the third state used by the interrogation utility model. The utility model uses `security_failed`.

---

## 🔐 Restricted Terminal

The Restricted Terminal code is reconstructed from three clues:

```text
Laboratory → 4
Storage    → 6
Cafeteria  → 19
```

Therefore:

```text
4 + 6 + 19 → 4619
```

Entering the correct PIN unlocks the terminal and allows the security system to evaluate the current evidence state.

---

## 🎯 Game Modes

### 🟢 Easy Mode

Easy Mode uses three non-TT evidence combinations:

* TF
* FT
* FF

These states are placed into a **random shuffle bag**.

Each state is used once before the bag is reshuffled for the next cycle.

The correct PIN always recovers the subtle audit clue, while Wordle security is skipped.

This allows the player to encounter different evidence configurations across cases without simply receiving the same state every time.

---

### 🔴 Hard Mode

Hard Mode guarantees the:

```text
Storage = True
Cafeteria = True
```

(TT) evidence state.

When both pieces of evidence are recovered, the **Wordle security challenge activates**.

The result of the security process supplies the final security-state percept used by the agent.

---

## 🧩 Agent Decision State Space

The complete security decision space is:

```text
Storage Evidence
        ×
Cafeteria Evidence
        ×
Security Failed
```

Therefore:

```text
2 × 2 × 2 = 8 states
```

### Easy Mode

The terminal check supplies the final security state.

### Hard Mode

The Wordle challenge supplies the final security state.

This keeps the security agent's percept model consistent across both game modes.

---

## 🕵️ Interrogation System

Interrogation is always available.

The detective can question every suspect and inspect their responses before making an accusation.

Each suspect has a defined response, while **Zephyr's behavior is dynamically determined by the utility-based model**.

Accusation becomes available after **all suspects have been questioned**, ensuring that the player has the opportunity to gather the complete set of testimony.

Interrogation transcripts display the detective's chosen name.

---

## 🔄 Game State

The game is controlled by a Python `GameState` object.

Starting a new case creates a **fresh game state**.

This prevents evidence, interrogation progress, and previous case information from carrying over incorrectly.

### New Case behavior

* **Easy Mode:** advances the player's shuffle-bag state.
* **Hard Mode:** creates the guaranteed TT state.

---

## 🛠️ Technology Stack

### Backend

* Python
* Flask

### Frontend

* HTML
* CSS
* JavaScript

### Deployment

* PythonAnywhere

### Version Control

* Git
* GitHub

---

## 📁 Project Structure

```text
Aaias_final_game/
│
├── app.py
├── templates/
│   └── index.html
│
├── static/
│   ├── style.css
│   └── ...
│
├── requirements.txt
└── README.md
```

Python owns the game state and agent logic, while the browser provides the interactive dossier-style interface.

---

## ▶️ Run Locally

Clone the repository:

```bash
git clone https://github.com/karleaabha-byte/Aaias_final_game.git
cd Aaias_final_game
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Run the Flask application:

```bash
python app.py
```

Open:

```text
http://127.0.0.1:8000
```

---

## ☁️ Deploy on PythonAnywhere

### 1. Clone the repository

Open a Bash console on PythonAnywhere:

```bash
git clone https://github.com/karleaabha-byte/Aaias_final_game.git
cd Aaias_final_game
```

### 2. Create a virtual environment

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Configure the Web App

In PythonAnywhere:

1. Open the **Web** tab.
2. Select **Add a new web app**.
3. Choose **Manual configuration**.
4. Select the same Python version used for the virtual environment.
5. Set the source directory to the cloned repository.
6. Set the virtualenv to:

```text
/home/YOUR_USERNAME/Aaias_final_game/.venv
```

### 4. Configure WSGI

Replace the WSGI configuration with:

```python
import sys

project = "/home/YOUR_USERNAME/Aaias_final_game"

if project not in sys.path:
    sys.path.insert(0, project)

from app import app as application
```

### 5. Reload

Reload the web application from the PythonAnywhere **Web** tab.

The game will then be available at:

```text
https://YOUR_USERNAME.pythonanywhere.com
```

---

## 🎮 Publishing Through itch.io

Because Python maintains each player's game state, the project should **not** be uploaded as a standalone `index.html` HTML5 game.

Instead:

1. Deploy the Flask application on PythonAnywhere.
2. Create an itch.io project page.
3. Add the deployed PythonAnywhere address as the game's external play link.
4. Players can launch the game directly through itch.io.

A native itch.io embed would require hosting the backend somewhere that supports the necessary cross-origin requests and credentials.

For this project, using the PythonAnywhere deployment as the external game link is the simplest approach.

---

## 🧠 What This Project Demonstrates

This project demonstrates how different AI agent architectures can be applied to different decisions within the **same environment**.

### Simple Reflex

The security agent:

```text
Current percepts
      ↓
Condition / state
      ↓
Security decision
```

It reacts only to the current percept state.

### Utility-Based

Zephyr's interrogation:

```text
Current game state
        ↓
Calculate possible utilities
        ↓
Compare truth vs. lie
        ↓
Choose higher-utility action
```

The behavior is therefore influenced by the relative utility of the available actions rather than requiring every possible outcome to be explicitly scripted.

---

## 📌 Project Title

**Simplex Reflex and Utility-Based Agentic Approach for Mystery Mole Detection Game**

---

## 👩‍💻 Authors

Developed as an AI/agent-based game project demonstrating the application of **Simple Reflex** and **Utility-Based** agent architectures in an interactive mystery environment.
