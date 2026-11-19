# Phish Drill

A small web game that teaches people to spot phishing emails. You get an
inbox of six made-up emails, open each one, hover over the links to see where
they really go, and decide: **phishing or safe?** Correct answers earn coins
and XP, you level up, and you unlock badges.

Built for a hackathon with plain HTML, CSS and JavaScript. There are no
frameworks, no build step and no server.

## How to run it

1. Download or clone this folder.
2. Open `index.html` in any modern browser (just double-click it).

That's all. An internet connection is only needed for the Google Fonts.

## Features

- Inbox-style simulator with 15 emails (a new random set of 6 each round)
- Hover over a link to reveal its real destination, just like in a real inbox
- After each answer, a short explanation of the clues
- Coins, XP, four levels and five badges
- Sound effects (can be muted) and confetti for a perfect round
- Practice login and sign-up, saved in the browser only (passwords are salted and hashed)
- Works on phones, and respects "reduce motion" settings

## Project structure

```
phish-drill/
├── index.html        the page layout
├── css/
│   └── style.css     all the styling (colours are variables at the top)
└── js/
    ├── emails.js     the practice emails, easy to edit or add to
    └── app.js        the game: login, inbox, scoring, levels, badges
```

## Adding your own email

Open `js/emails.js`, copy one of the email blocks, and change the text. Set
`phish: true` for a phishing email or `phish: false` for a safe one, and write
three short reasons in `why`.

## Changing the colours

All colours are at the top of `css/style.css` under `:root`. Change them there
and the whole site updates.

## Privacy

Nothing is sent anywhere. Accounts, coins and progress are saved only in your
own browser (localStorage). Every email and link in the game is fictional, and
no link actually goes anywhere.

## Ideas for next steps

- More emails, or a harder mode with trickier lookalike domains
- A leaderboard (this would need a small backend)
- Translations, for example Hindi
