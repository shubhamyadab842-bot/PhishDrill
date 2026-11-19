/* =====================================================
   Phish Drill – main script
   (the list of emails lives in emails.js)

   Sections:
     1. Saving data in the browser (localStorage)
     2. Login / sign-up
     3. Game state, levels and badges
     4. Sound, confetti and toast messages
     5. Drawing the inbox
     6. Answering and the final score screen
     7. Small page extras (scroll button, red-flag fade-in)
   ===================================================== */


/* ---------- 1. Saving data in the browser ---------- */
/* localStorage can fail (private mode, blocked cookies), so every
   read/write is wrapped in try/catch and the site still works without it. */

function saveItem(key, value) {
  try { localStorage.setItem(key, value); } catch (err) { /* ignore */ }
}

function loadItem(key) {
  try { return localStorage.getItem(key); } catch (err) { return null; }
}

function getUsers() {
  try { return JSON.parse(loadItem('phishdrill.users') || '{}'); }
  catch (err) { return {}; }
}


/* ---------- 2. Login / sign-up ---------- */
/* Everything is stored only in this browser. Passwords are never saved
   as plain text – we store a salted SHA-256 hash instead. */

let currentUser = loadItem('phishdrill.session');   // username, or null if logged out
if (currentUser && !getUsers()[currentUser]) currentUser = null;

let coins = 0;

function loadCoins() {
  coins = currentUser ? (parseInt(loadItem('phishdrill.coins.' + currentUser), 10) || 0) : 0;
}
function saveCoins() {
  if (currentUser) saveItem('phishdrill.coins.' + currentUser, String(coins));
}
loadCoins();

async function hashPassword(password, salt) {
  if (window.crypto && crypto.subtle) {
    const bytes = new TextEncoder().encode(salt + ':' + password);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // very old browsers: simple fallback hash
  let h = 5381;
  const text = salt + ':' + password;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return 'x' + h;
}

const authDialog = document.getElementById('authDlg');
const authForm   = document.getElementById('authForm');
const authButton = document.getElementById('authBtn');
let authMode = 'login';    // 'login' or 'signup'

function updateNavButton() {
  const account = getUsers()[currentUser];
  authButton.textContent = currentUser
    ? 'Log out (' + (account ? account.name : currentUser) + ')'
    : 'Log in';
}

function setAuthMode(mode) {
  authMode = mode;
  const signingUp = mode === 'signup';
  document.getElementById('tabLogin').setAttribute('aria-selected', String(!signingUp));
  document.getElementById('tabSignup').setAttribute('aria-selected', String(signingUp));
  document.getElementById('nameRow').style.display = signingUp ? 'block' : 'none';
  document.getElementById('authGo').textContent = signingUp ? 'Create account' : 'Log in';
  authForm.elements.p.autocomplete = signingUp ? 'new-password' : 'current-password';
  document.getElementById('authErr').textContent = '';
}

function openAuth(mode) {
  setAuthMode(mode || 'login');
  if (authDialog.showModal) authDialog.showModal();
  else authDialog.setAttribute('open', '');
}

function startSession(username) {
  currentUser = username;
  saveItem('phishdrill.session', username);
  loadCoins();
  updateNavButton();
  authDialog.close();
  authForm.reset();
  loadProgress();
  startRound();
  render();
}

function logout() {
  try { localStorage.removeItem('phishdrill.session'); } catch (err) { /* ignore */ }
  currentUser = null;
  loadCoins();
  updateNavButton();
  render();
}

authButton.addEventListener('click', function () {
  if (currentUser) logout(); else openAuth('login');
});
document.getElementById('authClose').addEventListener('click', () => authDialog.close());
document.getElementById('tabLogin').addEventListener('click', () => setAuthMode('login'));
document.getElementById('tabSignup').addEventListener('click', () => setAuthMode('signup'));

authForm.addEventListener('submit', async function (event) {
  event.preventDefault();
  const errorBox = document.getElementById('authErr');
  const fields = authForm.elements;
  const username = fields.u.value.trim().toLowerCase();
  const password = fields.p.value;
  const users = getUsers();

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    errorBox.textContent = 'Username must be 3 to 20 letters, numbers or underscores.';
    return;
  }

  if (authMode === 'signup') {
    if (users[username]) { errorBox.textContent = 'That username is taken. Try another.'; return; }
    if (password.length < 8) { errorBox.textContent = 'Use at least 8 characters for your password.'; return; }
    const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
    users[username] = {
      name: fields.n.value.trim() || username,
      salt: salt,
      hash: await hashPassword(password, salt)
    };
    saveItem('phishdrill.users', JSON.stringify(users));
  } else {
    const account = users[username];
    if (!account || account.hash !== await hashPassword(password, account.salt)) {
      errorBox.textContent = 'Wrong username or password.';
      return;
    }
  }
  startSession(username);
});


/* ---------- 3. Game state, levels and badges ---------- */

const gameBox = document.getElementById('sim');   // the area the game draws into

let emails = [];            // the 6 emails in the current round
let answers = [];           // null = not answered, true = correct, false = wrong
let flipButtons = [];       // randomly swaps the order of the two answer buttons
let selected = -1;          // which email is open (-1 = none)
let score = 0;
let streak = 0;             // right answers in a row
let xpThisRound = 0;
let newBadgesThisRound = [];
let progress = { xp: 0, badges: [] };   // saved per user
let seenEmails = [];        // so a new round doesn't repeat emails straight away

const LEVELS = [
  { name: 'Rookie',    xp: 0 },
  { name: 'Spotter',   xp: 60 },
  { name: 'Detective', xp: 150 },
  { name: 'Guardian',  xp: 300 }
];

const BADGES = {
  first:     { name: 'First Catch',    desc: 'Get your first answer right',    icon: '🎣' },
  streak3:   { name: 'Hot Streak',     desc: '3 right answers in a row',       icon: '🔥' },
  perfect:   { name: 'Perfect Round',  desc: 'Answer every email correctly',   icon: '🏆' },
  coins50:   { name: 'Coin Collector', desc: 'Collect 50 coins',               icon: '🪙' },
  detective: { name: 'Detective',      desc: 'Reach the Detective level',      icon: '🕵️' }
};

/* Stops text from being read as HTML (basic protection against injected tags) */
function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/* Picks 6 emails for a round. Rules: 2 to 4 of them are phishing,
   the order isn't a perfect phish/safe/phish/safe pattern, and there
   are never three of the same kind in a row. */
function dealEmails() {
  let pool = EMAILS.filter(e => seenEmails.indexOf(e) < 0);
  if (pool.length < 6) { seenEmails = []; pool = EMAILS.slice(); }

  let hand, valid, tries = 0;
  do {
    hand = shuffle(pool).slice(0, 6);
    const phishCount = hand.filter(e => e.phish).length;
    valid = phishCount >= 2 && phishCount <= 4;

    let alternating = true;
    for (let i = 1; i < 6; i++) {
      if (hand[i].phish === hand[i - 1].phish) alternating = false;
      if (i > 1 && hand[i].phish === hand[i - 1].phish && hand[i].phish === hand[i - 2].phish) valid = false;
    }
    if (alternating) valid = false;
    tries++;
  } while (!valid && tries < 300);

  seenEmails = seenEmails.concat(hand);
  return hand;
}

function startRound() {
  emails = dealEmails();
  answers = emails.map(() => null);
  flipButtons = emails.map(() => Math.random() < 0.5);
  score = 0;
  streak = 0;
  selected = -1;
  newBadgesThisRound = [];
  xpThisRound = 0;
}

function loadProgress() {
  try { progress = JSON.parse(loadItem('phishdrill.prog.' + currentUser) || ''); }
  catch (err) { progress = null; }
  if (!progress || typeof progress.xp !== 'number') progress = { xp: 0, badges: [] };
}
function saveProgress() {
  if (currentUser) saveItem('phishdrill.prog.' + currentUser, JSON.stringify(progress));
}

/* Works out the level, how far through it we are (%), and XP left to the next one */
function getLevel(xp) {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].xp) index = i;
  const current = LEVELS[index];
  const next = LEVELS[index + 1];
  return {
    index: index,
    name: current.name,
    percent: next ? Math.round((xp - current.xp) / (next.xp - current.xp) * 100) : 100,
    xpLeft: next ? next.xp - xp : 0
  };
}

function awardBadge(id) {
  if (progress.badges.indexOf(id) >= 0) return;     // already have it
  progress.badges.push(id);
  newBadgesThisRound.push(id);
  saveProgress();
  showToast('Badge unlocked: ' + BADGES[id].name + ' ' + BADGES[id].icon);
  playSound('badge');
}

function addXp(amount) {
  const before = getLevel(progress.xp).index;
  progress.xp += amount;
  xpThisRound += amount;
  saveProgress();

  const after = getLevel(progress.xp);
  if (after.index > before) {
    showToast('Level up! You are now a ' + after.name);
    playSound('badge');
    launchConfetti(70);
    if (after.index >= 2) awardBadge('detective');
  }
}

loadProgress();
startRound();


/* ---------- 4. Sound, confetti and toast messages ---------- */

/* Sounds are made with the Web Audio API, so no audio files are needed */
let audioContext = null;
let muted = loadItem('phishdrill.mute') === '1';

function playTone(frequency, startTime, duration, waveType) {
  const oscillator = audioContext.createOscillator();
  const volume = audioContext.createGain();
  oscillator.type = waveType || 'sine';
  oscillator.frequency.value = frequency;
  volume.gain.setValueAtTime(0.0001, startTime);
  volume.gain.exponentialRampToValueAtTime(0.12, startTime + 0.02);
  volume.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(volume);
  volume.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

function playSound(name) {
  if (muted) return;
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    const now = audioContext.currentTime;
    // each note is [frequency, delay, length, waveform]
    const tunes = {
      ok:    [[660, 0, .12], [880, .1, .18]],
      bad:   [[220, 0, .18, 'sawtooth'], [165, .14, .25, 'sawtooth']],
      badge: [[784, 0, .1], [988, .09, .1], [1318, .18, .25]],
      win:   [[523, 0, .12], [659, .11, .12], [784, .22, .12], [1047, .33, .4]]
    };
    tunes[name].forEach(n => playTone(n[0], now + n[1], n[2], n[3]));
  } catch (err) { /* sound is optional, so ignore errors */ }
}

function launchConfetti(count) {
  if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const colours = ['#C0C0C0', '#b999e8', '#4f1590', '#ffffff', '#8a5cd0'];
  const pieces = [];
  for (let i = 0; i < (count || 140); i++) {
    pieces.push({
      x: innerWidth / 2 + (Math.random() - 0.5) * 200,
      y: innerHeight * 0.4,
      vx: (Math.random() - 0.5) * 14,          // sideways speed
      vy: -Math.random() * 13 - 4,             // upward speed
      size: Math.random() * 8 + 4,
      colour: colours[i % colours.length],
      angle: Math.random() * 6,
      spin: (Math.random() - 0.5) * 0.3
    });
  }

  let startTime = null;
  function frame(time) {
    if (!startTime) startTime = time;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(function (p) {
      p.vy += 0.35;            // gravity
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.99;
      p.angle += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.colour;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    });
    if (time - startTime < 2600) requestAnimationFrame(frame);
    else canvas.remove();
  }
  frame(performance.now());
}

function showToast(text) {
  let holder = document.getElementById('toasts');
  if (!holder) {
    holder = document.createElement('div');
    holder.id = 'toasts';
    holder.setAttribute('aria-live', 'polite');
    document.body.appendChild(holder);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = text;
  holder.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}


/* ---------- 5. Drawing the inbox ---------- */

/* Shown when nobody is logged in */
function showLoginGate() {
  gameBox.innerHTML =
    '<div class="gate"><h3>Log in to start the drill</h3>' +
    '<p>Your coins are saved to your account on this device.</p>' +
    '<button class="btn" id="gl" type="button">Log in or sign up</button></div>';
  document.getElementById('gl').addEventListener('click', () => openAuth('login'));
}

/* Draws the whole game area: top bar + email list + reading pane */
function render() {
  if (!currentUser) return showLoginGate();

  gameBox.innerHTML =
    '<div class="hud">' +
      '<div class="lv"><div class="lvt"><b id="lvn"></b><span id="xpt"></span></div>' +
      '<div class="xp"><i id="xpb"></i></div></div>' +
      '<div class="hr"><button class="mute" id="mute" type="button"></button>' +
      '<span class="coins" id="coins" title="Your coins"><i class="coin"></i><b id="cn">' + coins + '</b></span></div>' +
    '</div>' +
    '<div class="inbox">' +
      '<aside class="list" aria-label="Inbox"><div class="lh"><b>Inbox</b><span id="chk"></span></div><div id="rows"></div></aside>' +
      '<section class="pane" id="pane" aria-live="polite"></section>' +
    '</div>';

  document.getElementById('mute').addEventListener('click', function () {
    muted = !muted;
    saveItem('phishdrill.mute', muted ? '1' : '0');
    drawTopBar();
  });

  drawTopBar();
  drawEmailList();
  drawReadingPane();
}

/* Level name, XP bar, mute icon and "x/6 checked" counter */
function drawTopBar() {
  const level = getLevel(progress.xp);
  const muteButton = document.getElementById('mute');
  document.getElementById('lvn').textContent = 'Level ' + (level.index + 1) + ' · ' + level.name;
  document.getElementById('xpt').textContent = level.xpLeft ? level.xpLeft + ' XP to next level' : 'Max level';
  document.getElementById('xpb').style.width = level.percent + '%';
  muteButton.textContent = muted ? '🔇' : '🔊';
  muteButton.setAttribute('aria-label', muted ? 'Turn sound on' : 'Turn sound off');
  document.getElementById('chk').textContent =
    answers.filter(a => a !== null).length + '/' + emails.length + ' checked';
}

/* The list of emails on the left */
function drawEmailList() {
  document.getElementById('rows').innerHTML = emails.map(function (email, i) {
    const state = answers[i] === null ? 'new' : (answers[i] ? 'ok' : 'no');
    const mark = state === 'ok' ? '✓' : state === 'no' ? '✗' : '';
    const preview = escapeHtml(email.body.replace(/\s+/g, ' ').slice(0, 48)) + '…';
    return '<button class="row ' + state + (i === selected ? ' sel' : '') + '" data-k="' + i + '" type="button">' +
      '<span class="mk">' + mark + '</span>' +
      '<span class="rt"><b>' + escapeHtml(email.from) + '</b>' +
      '<span class="sj">' + escapeHtml(email.subj) + '</span>' +
      '<span class="pv">' + preview + '</span></span></button>';
  }).join('');

  document.querySelectorAll('#rows .row').forEach(function (row) {
    row.addEventListener('click', function () {
      selected = +row.dataset.k;
      drawEmailList();
      drawReadingPane(true);
    });
  });
}

/* The open email on the right, with the two answer buttons */
function drawReadingPane(scrollToIt) {
  const pane = document.getElementById('pane');
  if (selected < 0) {
    pane.innerHTML = '<div class="empty">Open an email from the inbox, then decide: phishing or safe?</div>';
    return;
  }

  const i = selected;
  const email = emails[i];
  const alreadyAnswered = answers[i] !== null;

  const phishButton = '<button class="btn bad" data-a="1">Report as phishing</button>';
  const safeButton  = '<button class="btn ok" data-a="0">Mark as safe</button>';

  pane.innerHTML =
    '<div class="mail">' +
      '<div class="meta"><b>' + escapeHtml(email.from) + '</b> &lt;' + escapeHtml(email.addr) + '&gt;</div>' +
      '<div class="subj">' + escapeHtml(email.subj) + '</div>' +
      '<div class="body">' + escapeHtml(email.body) +
        (email.link ? '<button class="link" id="lk">' + escapeHtml(email.link) + '</button>' : '') + '</div>' +
      '<div class="status" id="st" aria-live="polite"></div>' +
    '</div>' +
    (alreadyAnswered ? '' : '<div class="choices" id="ch">' + (flipButtons[i] ? phishButton + safeButton : safeButton + phishButton) + '</div>') +
    '<div id="res"></div>';

  // hovering (or focusing) the link shows where it REALLY goes
  const linkButton = document.getElementById('lk');
  const statusLine = document.getElementById('st');
  if (linkButton) {
    const showTarget = () => { statusLine.textContent = 'Link goes to: ' + email.href; };
    const hideTarget = () => { statusLine.textContent = ''; };
    linkButton.addEventListener('mouseenter', showTarget);
    linkButton.addEventListener('focus', showTarget);
    linkButton.addEventListener('mouseleave', hideTarget);
    linkButton.addEventListener('blur', hideTarget);
    linkButton.addEventListener('click', function () {
      statusLine.textContent = 'Simulation: this link is disabled. In real life you’d have landed on: ' + email.href;
    });
  }

  document.querySelectorAll('#ch .btn').forEach(function (button) {
    button.addEventListener('click', () => answerEmail(i, button.dataset.a === '1'));
  });

  if (alreadyAnswered) showResult(i);
  if (scrollToIt && window.innerWidth < 820) pane.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}


/* ---------- 6. Answering and the final score screen ---------- */

/* Green/red box explaining why the email was phishing or safe */
function showResult(i) {
  const email = emails[i];
  const correct = answers[i];
  const unreadLeft = answers.filter(a => a === null).length;
  const heading = (correct ? 'Correct. ' : 'Not quite. ') + 'This one is ' + (email.phish ? 'phishing.' : 'safe.');

  document.getElementById('res').innerHTML =
    '<div class="result ' + (correct ? 'right' : 'wrong') + '" role="status">' +
      '<h3>' + heading + '</h3>' +
      '<ul>' + email.why.map(reason => '<li>' + reason + '</li>').join('') + '</ul>' +
      '<button class="btn" id="nx">' + (unreadLeft ? 'Next unread email' : 'See my results') + '</button>' +
    '</div>';

  document.getElementById('nx').addEventListener('click', function () {
    if (unreadLeft) {
      selected = answers.indexOf(null);
      drawEmailList();
      drawReadingPane(true);
    } else {
      showFinalScreen();
    }
  });
}

/* Called when the player clicks "phishing" or "safe" */
function answerEmail(i, saidPhishing) {
  if (answers[i] !== null) return;          // can't answer twice

  const correct = saidPhishing === emails[i].phish;
  answers[i] = correct;

  if (correct) {
    score++;
    coins++;
    saveCoins();
    animateCoinGain();
    streak++;
    addXp(10);
    playSound('ok');
    awardBadge('first');
    if (streak >= 3) awardBadge('streak3');
    if (coins >= 50) awardBadge('coins50');
  } else {
    streak = 0;
    playSound('bad');
  }

  const choices = document.getElementById('ch');
  if (choices) choices.style.display = 'none';
  showResult(i);
  drawEmailList();
  drawTopBar();
}

/* Coin spins and a "+1" floats up */
function animateCoinGain() {
  const coinBox = document.getElementById('coins');
  const counter = document.getElementById('cn');
  if (!coinBox || !counter) return;

  counter.textContent = coins;
  coinBox.classList.remove('bump');
  void coinBox.offsetWidth;                 // restarts the CSS animation
  coinBox.classList.add('bump');

  const plusOne = document.createElement('span');
  plusOne.className = 'plus';
  plusOne.textContent = '+1';
  coinBox.appendChild(plusOne);
  setTimeout(() => plusOne.remove(), 900);
}

function showFinalScreen() {
  const total = emails.length;
  const perfect = score === total;

  if (perfect) {
    addXp(20);
    awardBadge('perfect');
    launchConfetti();
    playSound('win');
  } else if (score >= total - 2) {
    playSound('win');
  }

  const message =
    perfect ? 'Perfect round! You spotted every single one.' :
    score >= total - 2 ? 'Sharp eyes. You’d spot most real attacks.' :
    score >= 3 ? 'Good start. Review the red flags and try again.' :
    'Phishing is built to fool people. Read the red flags and try again.';

  const level = getLevel(progress.xp);

  const badgeCards = Object.keys(BADGES).map(function (id) {
    const badge = BADGES[id];
    const owned = progress.badges.indexOf(id) >= 0;
    const justWon = newBadgesThisRound.indexOf(id) >= 0;
    return '<div class="bd' + (owned ? ' on' : '') + (justWon ? ' new' : '') + '">' +
      '<span>' + badge.icon + '</span><b>' + badge.name + '</b><small>' + badge.desc + '</small></div>';
  }).join('');

  gameBox.innerHTML =
    '<div class="final">' +
      '<div class="score"><span id="sc">0</span>/' + total + '</div>' +
      '<p>' + message + '</p>' +
      '<div class="earned"><i class="coin"></i>' + score + ' coin' + (score === 1 ? '' : 's') +
        ' and ' + xpThisRound + ' XP earned. Total coins: ' + coins + '</div>' +
      '<p class="lvl-line">Level ' + (level.index + 1) + ' · ' + level.name + '</p>' +
      '<h3 class="bh">Badges</h3><div class="badges">' + badgeCards + '</div>' +
      '<div class="fa"><button class="btn" id="rs" type="button">Play again</button> ' +
      '<a class="btn ghost" href="#flags">Review red flags</a></div>' +
    '</div>';

  document.getElementById('rs').addEventListener('click', function () {
    startRound();
    render();
  });

  // count the score up from 0 (skipped if the user prefers less motion)
  const scoreText = document.getElementById('sc');
  if (window.matchMedia('(prefers-reduced-motion:reduce)').matches || score === 0) {
    scoreText.textContent = score;
    return;
  }
  let start = null;
  function countUp(time) {
    if (!start) start = time;
    const progressPct = Math.min((time - start) / 700, 1);
    scoreText.textContent = Math.round(progressPct * score);
    if (progressPct < 1) requestAnimationFrame(countUp);
  }
  requestAnimationFrame(countUp);
}


/* ---------- Start the page ---------- */
updateNavButton();
render();


/* ---------- 7. Small page extras ---------- */

/* Round button in the corner: scrolls to the bottom, or back to the top
   once you are past the middle of the page */
(function setupScrollButton() {
  const button = document.getElementById('scrollBtn');

  function maxScroll() {
    return document.documentElement.scrollHeight - window.innerHeight;
  }
  function updateArrow() {
    const pastMiddle = window.scrollY > maxScroll() / 2;
    button.classList.toggle('up', pastMiddle);
    button.setAttribute('aria-label', pastMiddle ? 'Scroll to top' : 'Scroll to bottom');
  }

  button.addEventListener('click', function () {
    const goingUp = button.classList.contains('up');
    const smooth = !window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    window.scrollTo({ top: goingUp ? 0 : maxScroll(), behavior: smooth ? 'smooth' : 'auto' });
  });
  window.addEventListener('scroll', updateArrow, { passive: true });
  window.addEventListener('resize', updateArrow);
  updateArrow();
})();

/* Red-flag cards fade in the first time they scroll into view */
(function setupFlagFadeIn() {
  const list = document.getElementById('flagList');
  if (!list || !('IntersectionObserver' in window)) return;

  list.classList.add('pre');
  const observer = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting) {
      list.classList.remove('pre');
      observer.disconnect();
    }
  }, { threshold: 0.25 });
  observer.observe(list);
})();
