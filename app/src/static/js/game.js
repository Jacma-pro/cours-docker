(() => {
    const TAU = Math.PI * 2;
    const $ = id => document.getElementById(id);
    const canvas = $('game');
    const ctx = canvas.getContext('2d');

    let W, H, cx, cy, unit, s, rings;
    let state = 'menu'; // menu | play | over
    let clock = 0;
    let overAt = 0;
    let P, obs, orbs, parts, floats, stars;
    let score, combo, comboT, t, spawnT, shake;
    let best = 0;
    let muted = false;

    try {
        best = +localStorage.getItem('orbit-dodo-best') || 0;
        muted = localStorage.getItem('orbit-dodo-muted') === '1';
    } catch (e) {}

    // ---------- Son ----------
    let ac;
    function beep(freq, dur = 0.09, type = 'sine', vol = 0.05) {
        if (muted) return;
        try {
            ac = ac || new (window.AudioContext || window.webkitAudioContext)();
            const o = ac.createOscillator();
            const g = ac.createGain();
            o.type = type;
            o.frequency.value = freq;
            g.gain.setValueAtTime(vol, ac.currentTime);
            g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
            o.connect(g);
            g.connect(ac.destination);
            o.start();
            o.stop(ac.currentTime + dur);
        } catch (e) {}
    }

    // ---------- Mise en place ----------
    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cx = W / 2;
        cy = H / 2;
        unit = Math.min(W, H) / 2;
        s = unit / 420;
        rings = [0.36, 0.58, 0.8].map(k => k * unit);
        if (P) P.r = rings[P.ring];
    }

    function makeStars() {
        stars = Array.from({ length: 150 }, () => ({
            a: Math.random() * TAU,
            k: Math.random(),
            v: (Math.random() * 0.03 + 0.005) * (Math.random() < 0.5 ? -1 : 1),
            size: Math.random() * 1.6 + 0.3,
            tw: Math.random() * TAU,
        }));
    }

    function reset() {
        P = { ring: 1, r: rings[1], a: -Math.PI / 2, trail: [] };
        obs = [];
        orbs = [];
        parts = [];
        floats = [];
        score = 0;
        combo = 0;
        comboT = 0;
        t = 0;
        spawnT = 0.8;
        shake = 0;
    }

    const mult = () => 1 + Math.min(combo, 10) * 0.5;
    const speedFactor = () => 1 + Math.min(t / 50, 1.5);
    const posOf = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];

    // ---------- Apparitions ----------
    function spawn() {
        const sp = speedFactor();
        const a = P.a + Math.PI + (Math.random() - 0.5) * 1.8;
        const ring = Math.floor(Math.random() * 3);
        if (Math.random() < 0.3) {
            orbs.push({
                a,
                ring,
                r: rings[ring],
                w: (Math.random() - 0.5) * 0.8,
                age: 0,
                life: 9,
            });
            return;
        }
        const size = (11 + Math.random() * 8) * s;
        obs.push({
            a,
            ring,
            r: rings[ring],
            w: (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 1.0) * sp,
            size,
            rot: Math.random() * TAU,
            spin: (Math.random() - 0.5) * 4,
            shape: Array.from({ length: 8 }, () => 0.72 + Math.random() * 0.4),
            hopT: Math.random() < 0.4 ? 2.5 + Math.random() * 2.5 : Infinity,
            age: 0,
            life: 14,
            minD: Infinity,
            near: false,
        });
    }

    function burst(x, y, color, n, speed, size = 3) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * TAU;
            const v = (0.3 + Math.random()) * speed * s;
            parts.push({
                x,
                y,
                vx: Math.cos(a) * v,
                vy: Math.sin(a) * v,
                life: 0,
                max: 0.5 + Math.random() * 0.7,
                color,
                size: (0.5 + Math.random()) * size * Math.max(s, 0.6),
            });
        }
    }

    function float(x, y, text, color) {
        floats.push({ x, y, text, color, life: 0 });
    }

    // ---------- Logique ----------
    function updateFx(dt) {
        for (const p of parts) {
            p.life += dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 1 - dt * 1.8;
            p.vy *= 1 - dt * 1.8;
        }
        parts = parts.filter(p => p.life < p.max);
        for (const f of floats) f.life += dt;
        floats = floats.filter(f => f.life < 1.1);
        shake = Math.max(0, shake - dt * 40);
    }

    function die(px, py) {
        state = 'over';
        overAt = clock;
        shake = 22;
        burst(px, py, '#ffffff', 40, 320, 3);
        burst(px, py, '#ec4899', 40, 260, 4);
        burst(px, py, '#8b5cf6', 30, 200, 4);
        beep(140, 0.5, 'sawtooth', 0.08);
        beep(70, 0.7, 'square', 0.05);

        const final = Math.floor(score);
        const record = final > best;
        if (record) {
            best = final;
            try {
                localStorage.setItem('orbit-dodo-best', String(best));
            } catch (e) {}
        }
        $('final').textContent = final;
        $('record').textContent = record
            ? '🏆 Nouveau record !'
            : `Record : ${best}`;
        $('best').textContent = best;
        setTimeout(() => {
            if (state === 'over') $('over').classList.remove('hidden');
        }, 700);
    }

    function update(dt) {
        t += dt;
        const sp = speedFactor();

        P.a += 1.6 * (1 + (sp - 1) * 0.3) * dt;
        P.r += (rings[P.ring] - P.r) * Math.min(1, dt * 14);
        const [px, py] = posOf(P.a, P.r);
        P.trail.push([px, py]);
        if (P.trail.length > 30) P.trail.shift();
        const pr = 10 * s;

        score += dt * 10 * mult();
        comboT -= dt;
        if (comboT <= 0) combo = 0;

        spawnT -= dt;
        if (spawnT <= 0) {
            spawn();
            spawnT = Math.max(0.35, 1.15 - t / 90) * (0.7 + Math.random() * 0.6);
        }

        for (const o of obs) {
            o.age += dt;
            o.a += o.w * dt;
            o.rot += o.spin * dt;
            o.r += (rings[o.ring] - o.r) * Math.min(1, dt * 6);
            o.hopT -= dt;
            if (o.hopT <= 0) {
                o.ring = (o.ring + (o.ring === 1 ? (Math.random() < 0.5 ? -1 : 1) : o.ring === 0 ? 1 : -1));
                o.hopT = 2.5 + Math.random() * 2.5;
            }
            if (o.age < 0.7) continue;

            const [ox, oy] = posOf(o.a, o.r);
            const d = Math.hypot(ox - px, oy - py);
            if (d < pr * 0.85 + o.size * 0.8) {
                die(px, py);
                return;
            }
            if (d < o.minD) o.minD = d;
            if (!o.near && o.minD < pr + o.size + 14 * s && d > o.minD + 3 * s) {
                o.near = true;
                const bonus = Math.round(25 * mult());
                score += bonus;
                float(px, py - 20 * s, `FRÔLÉ +${bonus}`, '#fbbf24');
                burst(px, py, '#fbbf24', 10, 120, 2);
                beep(880, 0.08, 'triangle', 0.04);
            }
        }
        obs = obs.filter(o => o.age < o.life);

        for (const o of orbs) {
            o.age += dt;
            o.a += o.w * dt;
            const [ox, oy] = posOf(o.a, o.r);
            if (Math.hypot(ox - px, oy - py) < pr + 9 * s) {
                o.age = o.life;
                combo++;
                comboT = 3;
                const gain = Math.round(50 * mult());
                score += gain;
                float(ox, oy - 14 * s, `+${gain}`, '#67e8f9');
                burst(ox, oy, '#67e8f9', 16, 180, 3);
                beep(520 + Math.min(combo, 10) * 55, 0.1, 'sine', 0.06);
            }
        }
        orbs = orbs.filter(o => o.age < o.life);
    }

    // ---------- Rendu ----------
    function drawBackground() {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(W, H) / 2);
        g.addColorStop(0, '#1b1246');
        g.addColorStop(0.6, '#0b0728');
        g.addColorStop(1, '#05030f');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        const far = Math.hypot(W, H) / 2;
        for (const st of stars) {
            const a = st.a + clock * st.v;
            const r = st.k * far;
            ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(clock * 1.5 + st.tw));
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, st.size, 0, TAU);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function drawSun() {
        const pulse = 1 + 0.05 * Math.sin(clock * 3);
        const r = 0.15 * unit * pulse;
        let g = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 4);
        g.addColorStop(0, 'rgba(236,72,153,0.4)');
        g.addColorStop(1, 'rgba(236,72,153,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 4, 0, TAU);
        ctx.fill();

        g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
        g.addColorStop(0, '#fff7ed');
        g.addColorStop(0.45, '#fdba74');
        g.addColorStop(1, '#ec4899');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        ctx.fill();
    }

    function drawRings() {
        rings.forEach((r, i) => {
            const active = state === 'play' && i === P.ring;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, TAU);
            ctx.lineWidth = active ? 2.5 : 1.2;
            ctx.strokeStyle = active ? 'rgba(167,139,250,0.95)' : 'rgba(255,255,255,0.13)';
            ctx.shadowColor = '#8b5cf6';
            ctx.shadowBlur = active ? 18 : 0;
            ctx.setLineDash(active ? [] : [6, 10]);
            ctx.stroke();
        });
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
    }

    function drawAsteroid(o) {
        const [x, y] = posOf(o.a, o.r);
        const appear = Math.min(1, o.age / 0.7);
        const warn = o.hopT < 0.7 && Math.floor(clock * 14) % 2 === 0;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(o.rot);
        ctx.scale(appear, appear);
        ctx.globalAlpha = 0.35 + 0.65 * appear;
        ctx.shadowColor = '#ff4d6d';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        o.shape.forEach((k, i) => {
            const a = (i / o.shape.length) * TAU;
            const px = Math.cos(a) * o.size * k;
            const py = Math.sin(a) * o.size * k;
            i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        });
        ctx.closePath();
        ctx.fillStyle = warn ? '#ffffff' : '#ff4d6d';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = warn ? '#fbbf24' : '#ffb3c1';
        ctx.stroke();
        ctx.restore();
    }

    function drawOrb(o) {
        const [x, y] = posOf(o.a, o.r);
        const fade = Math.min(1, o.age / 0.3, (o.life - o.age) / 1);
        const pulse = 1 + 0.15 * Math.sin(clock * 6 + o.a);
        ctx.save();
        ctx.globalAlpha = Math.max(0, fade);
        ctx.shadowColor = '#67e8f9';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#67e8f9';
        ctx.beginPath();
        ctx.arc(x, y, 8 * s * pulse, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(103,232,249,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, (12 + 6 * ((clock * 1.2) % 1)) * s, 0, TAU);
        ctx.stroke();
        ctx.restore();
    }

    function drawPlayer() {
        const pr = 10 * s;
        const n = P.trail.length;
        P.trail.forEach(([x, y], i) => {
            const k = i / n;
            ctx.fillStyle = `rgba(167,139,250,${k * 0.45})`;
            ctx.beginPath();
            ctx.arc(x, y, pr * k * 0.85, 0, TAU);
            ctx.fill();
        });

        const [x, y] = posOf(P.a, P.r);
        const dx = -Math.sin(P.a);
        const dy = Math.cos(P.a);
        const nx = Math.cos(P.a);
        const ny = Math.sin(P.a);

        ctx.save();
        ctx.shadowColor = '#c4b5fd';
        ctx.shadowBlur = 22;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, pr, 0, TAU);
        ctx.fill();
        ctx.restore();

        // bec
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.moveTo(x + dx * pr * 0.7 + nx * pr * 0.4, y + dy * pr * 0.7 + ny * pr * 0.4);
        ctx.lineTo(x + dx * pr * 1.75, y + dy * pr * 1.75);
        ctx.lineTo(x + dx * pr * 0.7 - nx * pr * 0.4, y + dy * pr * 0.7 - ny * pr * 0.4);
        ctx.closePath();
        ctx.fill();

        // œil
        ctx.fillStyle = '#1b1246';
        ctx.beginPath();
        ctx.arc(x + dx * pr * 0.3 - nx * pr * 0.3, y + dy * pr * 0.3 - ny * pr * 0.3, pr * 0.2, 0, TAU);
        ctx.fill();
    }

    function drawFx() {
        for (const p of parts) {
            ctx.globalAlpha = 1 - p.life / p.max;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, TAU);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.textAlign = 'center';
        ctx.font = `800 ${Math.max(13, 15 * s * 1.4)}px Poppins, sans-serif`;
        for (const f of floats) {
            ctx.globalAlpha = 1 - f.life / 1.1;
            ctx.fillStyle = f.color;
            ctx.shadowColor = f.color;
            ctx.shadowBlur = 10;
            ctx.fillText(f.text, f.x, f.y - f.life * 40 * s);
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    function draw() {
        ctx.save();
        if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        drawBackground();
        drawSun();
        drawRings();
        orbs.forEach(drawOrb);
        obs.forEach(drawAsteroid);
        if (state !== 'over') drawPlayer();
        drawFx();
        ctx.restore();

        if (state === 'play') {
            $('score').textContent = Math.floor(score);
            const m = mult();
            $('mult').textContent = m > 1 ? `×${m % 1 ? m.toFixed(1) : m} combo` : '';
        }
    }

    // ---------- Boucle ----------
    let last = performance.now();
    function loop(now) {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        clock += dt;
        if (state === 'play') update(dt);
        else if (state === 'menu') P.a += 0.6 * dt;
        updateFx(dt);
        draw();
        requestAnimationFrame(loop);
    }

    // ---------- Contrôles ----------
    function start() {
        if (state === 'play') return;
        if (state === 'over' && clock - overAt < 0.7) return;
        reset();
        state = 'play';
        $('menu').classList.add('hidden');
        $('over').classList.add('hidden');
        $('hud').classList.remove('hidden');
        $('best-box').classList.remove('hidden');
        $('best').textContent = best;
        $('score').textContent = '0';
        $('mult').textContent = '';
        beep(440, 0.12, 'triangle', 0.05);
        setTimeout(() => beep(660, 0.14, 'triangle', 0.05), 90);
    }

    function move(dir) {
        if (state !== 'play') return;
        const next = Math.max(0, Math.min(2, P.ring + dir));
        if (next !== P.ring) {
            P.ring = next;
            beep(300 + next * 90, 0.05, 'square', 0.025);
            burst(...posOf(P.a, P.r), '#a78bfa', 6, 90, 2);
        }
    }

    window.addEventListener('keydown', e => {
        const k = e.key;
        if (['ArrowUp', 'ArrowLeft', 'w', 'W', 'a', 'A'].includes(k)) move(-1);
        else if (['ArrowDown', 'ArrowRight', 's', 'S', 'd', 'D'].includes(k)) move(1);
        else if (k === ' ' || k === 'Enter') {
            if (state !== 'play') start();
        } else if (k === 'm' || k === 'M') toggleMute();
        else return;
        e.preventDefault();
    });

    canvas.addEventListener('pointerdown', e => {
        if (state !== 'play') return;
        const d = Math.hypot(e.clientX - cx, e.clientY - cy);
        move(d < P.r ? -1 : 1);
    });

    function toggleMute() {
        muted = !muted;
        $('mute').textContent = muted ? '🔇' : '🔊';
        try {
            localStorage.setItem('orbit-dodo-muted', muted ? '1' : '0');
        } catch (e) {}
    }

    $('mute').addEventListener('click', e => {
        toggleMute();
        e.currentTarget.blur();
    });
    $('play').addEventListener('click', start);
    $('again').addEventListener('click', start);
    window.addEventListener('resize', resize);

    // ---------- Démarrage ----------
    $('mute').textContent = muted ? '🔇' : '🔊';
    $('best').textContent = best;
    resize();
    makeStars();
    reset();
    requestAnimationFrame(loop);
})();
