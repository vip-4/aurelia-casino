/* ==========================================================================
   Aurelia Casino — game logic
   Plain JavaScript, no dependencies. Virtual credits only.
   ========================================================================== */
(function () {
  'use strict';

  var BALANCE_KEY = 'aurelia_balance';
  var START_BALANCE = 1000;
  var MAX_BET = 500;

  /* ---------- Storage helpers ---------- */
  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  function getBalance() {
    var b = load(BALANCE_KEY, START_BALANCE);
    return (typeof b === 'number' && isFinite(b)) ? b : START_BALANCE;
  }
  function setBalance(value) {
    save(BALANCE_KEY, value);
    renderBalance();
  }
  function renderBalance() {
    var el = document.getElementById('balance');
    if (el) el.textContent = getBalance().toLocaleString('en-US');
  }
  function getBet() {
    var el = document.getElementById('bet-amount');
    var v = parseInt(el ? el.value : '10', 10);
    if (!v || v < 1) v = 1;
    if (v > MAX_BET) v = MAX_BET;
    if (el) el.value = v;
    return v;
  }
  function setMessage(text, kind) {
    var el = document.getElementById('message');
    if (!el) return;
    el.textContent = text;
    el.className = 'message' + (kind ? ' ' + kind : '');
  }
  function bindCommon() {
    renderBalance();
    var reset = document.getElementById('reset-balance');
    if (reset) reset.addEventListener('click', function () {
      setBalance(START_BALANCE);
      setMessage('Balance reset to ' + START_BALANCE.toLocaleString() + ' credits.', '');
    });
    var max = document.getElementById('max-bet');
    if (max) max.addEventListener('click', function () {
      var bet = document.getElementById('bet-amount');
      var b = getBalance();
      bet.value = Math.min(MAX_BET, b);
    });
  }
  function renderStats(prefix, stats) {
    var map = { slots: ['stat-spins', 'stat-wins', 'stat-best'], blackjack: ['stat-rounds', 'stat-wins', 'stat-best'], dice: ['stat-rolls', 'stat-wins', 'stat-best'] };
    var ids = map[prefix];
    if (!ids) return;
    document.getElementById(ids[0]).textContent = stats.rounds || stats.spins || 0;
    document.getElementById(ids[1]).textContent = stats.wins || 0;
    document.getElementById(ids[2]).textContent = (stats.best || 0).toLocaleString('en-US');
  }

  /* ==========================================================================
     SLOTS
     ========================================================================== */
  function initSlots() {
    var symbols = ['🍒', '🍋', '⭐', '💎', '🍀', '🔔'];
    var reels = [
      document.getElementById('reel-0'),
      document.getElementById('reel-1'),
      document.getElementById('reel-2')
    ];
    var spinBtn = document.getElementById('spin-btn');
    var results = [null, null, null];
    var spinning = false;
    var stats = load('aurelia_slots_stats', { spins: 0, wins: 0, best: 0 });

    renderStats('slots', stats);

    spinBtn.addEventListener('click', function () {
      if (spinning) return;
      var bet = getBet();
      var balance = getBalance();
      if (bet > balance) {
        setMessage('Not enough credits. Lower your bet or reset your balance.', 'lose');
        return;
      }
      spinning = true;
      spinBtn.disabled = true;
      setBalance(balance - bet);
      setMessage('Spinning the reels…', '');
      reels.forEach(function (r) { r.classList.add('spinning'); });

      var delays = [420, 760, 1120];
      reels.forEach(function (reel, i) {
        window.setTimeout(function () {
          var symbol = symbols[Math.floor(Math.random() * symbols.length)];
          results[i] = symbol;
          reel.textContent = symbol;
          reel.classList.remove('spinning');
        }, delays[i]);
      });

      window.setTimeout(function () {
        var win = 0;
        if (results[0] === results[1] && results[1] === results[2]) win = bet * 10;
        else if (results[0] === results[1] || results[1] === results[2] || results[0] === results[2]) win = bet * 2;

        setBalance(getBalance() + win);
        stats.spins += 1;
        if (win > 0) { stats.wins += 1; stats.best = Math.max(stats.best, win); }
        save('aurelia_slots_stats', stats);
        renderStats('slots', stats);

        if (win > 0) setMessage('You won ' + win.toLocaleString() + ' credits! Nice spin.', 'win');
        else setMessage('No match this time. Give it another spin.', 'lose');
        spinning = false;
        spinBtn.disabled = false;
      }, 1200);
    });
  }

  /* ==========================================================================
     BLACKJACK
     ========================================================================== */
  function initBlackjack() {
    var SUITS = ['♠', '♥', '♦', '♣'];
    var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    var deck = [], player = [], dealer = [], hidden = false, inRound = false;
    var dealBtn = document.getElementById('deal-btn');
    var hitBtn = document.getElementById('hit-btn');
    var standBtn = document.getElementById('stand-btn');
    var stats = load('aurelia_blackjack_stats', { rounds: 0, wins: 0, best: 0 });

    renderStats('blackjack', stats);

    function makeDeck() {
      var d = [];
      SUITS.forEach(function (s) {
        RANKS.forEach(function (r) { d.push({ rank: r, suit: s }); });
      });
      return d;
    }
    function shuffle(d) {
      for (var i = d.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = d[i]; d[i] = d[j]; d[j] = t;
      }
      return d;
    }
    function value(hand) {
      var total = 0, aces = 0;
      hand.forEach(function (c) {
        if (c.rank === 'A') { total += 11; aces += 1; }
        else if (['J', 'Q', 'K'].indexOf(c.rank) > -1) total += 10;
        else total += parseInt(c.rank, 10);
      });
      while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
      return total;
    }
    function createCardEl(card) {
      var el = document.createElement('div');
      el.className = 'playing-card' + (card.suit === '♥' || card.suit === '♦' ? ' red' : '');
      el.innerHTML = '<span class="c-rank">' + card.rank + '</span><span class="c-suit">' + card.suit + '</span>';
      el.setAttribute('aria-label', card.rank + ' of ' + card.suit);
      return el;
    }
    function render() {
      var dc = document.getElementById('dealer-cards');
      var pc = document.getElementById('player-cards');
      dc.innerHTML = ''; pc.innerHTML = '';
      dealer.forEach(function (card, i) {
        if (i === 1 && hidden) {
          var back = document.createElement('div');
          back.className = 'card-back';
          back.setAttribute('aria-label', 'Face-down card');
          dc.appendChild(back);
        } else dc.appendChild(createCardEl(card));
      });
      player.forEach(function (card) { pc.appendChild(createCardEl(card)); });
      document.getElementById('dealer-total').textContent = hidden ? '' : '(' + value(dealer) + ')';
      document.getElementById('player-total').textContent = '(' + value(player) + ')';
    }
    function finish(kind, payout, text) {
      setBalance(getBalance() + payout);
      stats.rounds += 1;
      if (kind === 'win') {
        stats.wins += 1;
        stats.best = Math.max(stats.best, payout);
        setMessage(text, 'win');
      } else if (kind === 'push') setMessage(text, '');
      else setMessage(text, 'lose');
      save('aurelia_blackjack_stats', stats);
      renderStats('blackjack', stats);
      inRound = false;
      dealBtn.disabled = false;
      hitBtn.disabled = true;
      standBtn.disabled = true;
    }
    function dealerPlay() {
      hidden = false;
      render();
      while (value(dealer) < 17) {
        dealer.push(deck.pop());
        render();
      }
      var p = value(player), d = value(dealer);
      var bet = getBet();
      if (d > 21 || p > d) finish('win', bet * 2, 'You win! ' + (bet * 2).toLocaleString() + ' credits.');
      else if (p === d) finish('push', bet, 'Push — your bet is returned.');
      else finish('lose', 0, 'Dealer wins. Better luck next round.');
    }

    dealBtn.addEventListener('click', function () {
      var bet = getBet();
      if (bet > getBalance()) {
        setMessage('Not enough credits. Lower your bet or reset your balance.', 'lose');
        return;
      }
      setBalance(getBalance() - bet);
      deck = shuffle(makeDeck());
      player = []; dealer = [];
      player.push(deck.pop()); dealer.push(deck.pop());
      player.push(deck.pop()); dealer.push(deck.pop());
      hidden = true;
      inRound = true;
      render();
      dealBtn.disabled = true;
      hitBtn.disabled = false;
      standBtn.disabled = false;

      var pv = value(player), dv = value(dealer);
      if (pv === 21 && dv === 21) finish('push', bet, 'Both hands are 21 — push.');
      else if (pv === 21) { hidden = false; render(); finish('win', bet * 2, 'Blackjack! You win ' + (bet * 2).toLocaleString() + ' credits.'); }
      else if (dv === 21) { hidden = false; render(); finish('lose', 0, 'Dealer has 21. You lose this round.'); }
      else setMessage('Your turn — Hit or Stand?', '');
    });

    hitBtn.addEventListener('click', function () {
      if (!inRound) return;
      player.push(deck.pop());
      render();
      if (value(player) > 21) finish('lose', 0, 'Bust! You went over 21.');
      else if (value(player) === 21) { hitBtn.disabled = true; dealerPlay(); }
    });

    standBtn.addEventListener('click', function () {
      if (!inRound) return;
      hitBtn.disabled = true;
      standBtn.disabled = true;
      dealerPlay();
    });
  }

  /* ==========================================================================
     DICE
     ========================================================================== */
  function initDice() {
    var LAYOUTS = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8]
    };
    var dice = [document.getElementById('die-0'), document.getElementById('die-1')];
    var pick = document.getElementById('pick-number');
    var rollBtn = document.getElementById('roll-btn');
    var rolling = false;
    var stats = load('aurelia_dice_stats', { rounds: 0, wins: 0, best: 0 });

    renderStats('dice', stats);

    function renderDie(el, face) {
      el.innerHTML = '';
      var on = LAYOUTS[face] || [];
      for (var i = 0; i < 9; i++) {
        var pip = document.createElement('span');
        pip.className = 'pip' + (on.indexOf(i) > -1 ? '' : ' hidden');
        el.appendChild(pip);
      }
      el.setAttribute('aria-label', 'Die showing ' + face);
    }

    [1, 4].forEach(function (face, i) { renderDie(dice[i], face); });

    rollBtn.addEventListener('click', function () {
      if (rolling) return;
      var bet = getBet();
      if (bet > getBalance()) {
        setMessage('Not enough credits. Lower your bet or reset your balance.', 'lose');
        return;
      }
      rolling = true;
      rollBtn.disabled = true;
      setBalance(getBalance() - bet);
      setMessage('Rolling the dice…', '');
      dice.forEach(function (d) { d.classList.add('rolling'); });

      window.setTimeout(function () {
        var chosen = parseInt(pick.value, 10);
        var d1 = Math.floor(Math.random() * 6) + 1;
        var d2 = Math.floor(Math.random() * 6) + 1;
        renderDie(dice[0], d1);
        renderDie(dice[1], d2);
        dice.forEach(function (d) { d.classList.remove('rolling'); });

        var matches = (d1 === chosen ? 1 : 0) + (d2 === chosen ? 1 : 0);
        var win = matches === 2 ? bet * 5 : (matches === 1 ? bet * 2 : 0);
        setBalance(getBalance() + win);
        stats.rounds += 1;
        if (win > 0) { stats.wins += 1; stats.best = Math.max(stats.best, win); }
        save('aurelia_dice_stats', stats);
        renderStats('dice', stats);

        if (matches === 2) setMessage('Double ' + chosen + '! You win ' + win.toLocaleString() + ' credits.', 'win');
        else if (matches === 1) setMessage('A ' + chosen + ' landed — you win ' + win.toLocaleString() + ' credits.', 'win');
        else setMessage('No ' + chosen + ' this roll. Try again!', 'lose');
        rolling = false;
        rollBtn.disabled = false;
      }, 520);
    });
  }

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    bindCommon();
    var game = document.body.getAttribute('data-game');
    if (game === 'slots') initSlots();
    else if (game === 'blackjack') initBlackjack();
    else if (game === 'dice') initDice();
  });
})();
