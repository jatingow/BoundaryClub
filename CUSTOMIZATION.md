# Auction App Customization

The app works without custom photos, logos, or audio. These additions are optional.

## Audio

Audio files are loaded from the `sounds/` folder next to `auction.html`.

Supported files:

- `bid.wav` — played when a team bids
- `team1.wav`, `team2.wav`, `team3.wav`, `team4.wav` — optional team-specific bid sounds
- `tension.wav` — countdown sound
- `unsold.wav` — unsold player sound
- `crowd-loop.mp3` — optional background crowd loop

To replace a sound, keep the same filename and place the new file in `sounds/`.
If a file is missing, the auction still works; only that sound is unavailable.

## Player photos

Photos are optional. Open **Manage Player DB**, edit a player, and paste an image URL
into **Optional Photo URL**. Leave it empty to use the normal text-only player card.

Example:

```text
https://example.com/players/player-name.jpg
```

The image is shown only when the URL loads successfully. Avoid very large images;
square images work best.

## Team logos and branding

The current interface keeps team identity text-based and uses the built-in role and
status icons. You can add custom logos later without changing auction behaviour.
Place local logo files in `assets/` and use stable relative paths such as:

```text
assets/team-one.png
```

Use PNG or SVG files with transparent backgrounds for the cleanest result.

## Team colours

Team colour is optional and is used only for team identity in the auction view.
Choose a colour beside each team name on the main setup screen before starting an
auction. The default accents are restrained blue, red, green, and purple for team
identity; the rest of the interface remains monochrome.
Changing a team colour does not change bidding rules, purse values, or player data.

## Pool navigation

Open **Auction Centre → Pools** to see every configured pool, its total players,
remaining players, and processed players. Use **Jump to ... pool** to open the next
available player in that pool. Completed pools remain visible for progress tracking
but cannot be opened again.

## Data notes

Player edits and optional photo URLs are saved in the browser's local storage.
They are tied to the browser and device where the app is opened. Use the existing
player export/import controls if you need to move the database to another browser.
