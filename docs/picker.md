# Movie Night Picker

The Picker helps a group decide what to watch by scoring your library against reference titles you provide.

## Starting a session

1. Go to **Picker** in the nav
2. Add one or more **Like these** titles — films that capture the mood you're after
3. Optionally add **Not like these** titles to push unwanted vibes down the rankings
4. Click **Find movies** — Screened scores your watchlist and returns a ranked list

## Shared sessions

Click **Start shared session** to get a shareable room link. Anyone with the link can add reference titles and see results update in real time. This is the core "what should we watch tonight?" flow for groups.

## How scoring works

Screened uses two scoring paths depending on your configuration:

- **Library scoring** (always available) — matches titles in your watchlist against the reference films using genre, cast, and metadata signals
- **Discovery scoring** (requires `OPENAI_API_KEY`) — generates text embeddings for each title and scores by semantic similarity, enabling "vibe-based" matching beyond genre tags

Both paths are combined and weighted. The more reference titles you add, the more accurate the ranking.
