# Strider Mode Solo RPG CLI

An interactive, text-based solo RPG set in Tolkien's Middle-earth, inspired by The One Ring 2E Strider Mode procedures.

## What You Can Do

- Play as a lone adventurer with persistent state.
- Run Strider-style skill checks and risk outcomes.
- Use the Telling Table style yes/no oracle.
- Trigger Lore prompts for scene inspiration.
- Travel through Border/Wild/Dark lands with solo journey events.
- Track Eye Awareness and trigger Revelation Episodes.
- Manage and advance patron missions.
- Get atmospheric narration from:
  - fallback built-in narrator, or
  - OpenAI narration if `OPENAI_API_KEY` is set.

## Run

```bash
npm start
```

## Optional AI Narration

Set environment variables before launch:

```bash
export OPENAI_API_KEY="your_key_here"
export OPENAI_MODEL="gpt-4o-mini"
npm start
```

If no API key is set, the game uses local fallback narration.

## Commands

- `intro` - opening narrative
- `status` - hero and campaign state
- `mission` - current mission details
- `newmission` - generate a new mission
- `advance` - advance mission progress
- `roll <skill> [risk]` - run a skill roll; risk in `standard|hazardous|foolish`
- `tell <chance> <question>` - oracle question; chance in `certain|likely|middling|doubtful|unthinkable`
- `lore` - generate a lore prompt
- `travel <border|wild|dark>` - trigger solo journey event
- `narrate <text>` - request narration for a scene or action
- `rest` - recover hope / reduce fatigue
- `quit` - save and exit

## Save File

Game progress is saved in:

- `savegame.json`

## Project Layout

- `src/cli.js` - interactive command loop
- `src/game/session.js` - command handling and game mechanics
- `src/game/state.js` - save/load and default character/campaign
- `src/game/narrator.js` - AI narrator integration and fallback narration
- `src/engine/striderEngine.js` - reusable Strider mechanics helpers
- `docs/strider-mode-rules-schema.json` - structured source rules model
- `sourcebooks/*.txt` - extracted sourcebook text for reference/indexing
