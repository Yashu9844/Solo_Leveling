import random, statistics

# ---- FINAL ECONOMY (Android-first, real-routine quest set) ----
CORE = {
    "career":    (100, "CAREER"),    # 3+ quality applications
    "dsa":       (100, "MIND"),      # >=25 min or 1 problem
    "build":     (100, "CRAFT"),     # >=45 min AI/agentic (learn or ship)
    "training":  (100, "BODY"),      # session OR >=8000 steps
    "sleep":     ( 60, "SLEEP"),     # wake within +/-30 min
    "attention": ( 40, "ATTENTION"), # screen time <= cap
}
CORE_TOTAL = sum(v[0] for v in CORE.values())

CATEGORY_CAP = {"CAREER":140,"MIND":200,"CRAFT":200,"BODY":150,
                "SLEEP":60,"ATTENTION":40,"LEARN":75,"MAINT":20}
DAILY_CAP = 700

def level_req(n): return int(round((200 + 75*(n**0.98))/10.0)*10)
def cum_xp(l):    return sum(level_req(n) for n in range(1,l))
def level_at(x):
    l,s=1,0
    while s+level_req(l)<=x: s+=level_req(l); l+=1
    return l, x-s, level_req(l)

def realistic_day(rng, p):
    """Simulate one day at core-completion probability p, with realistic bonuses."""
    cat = {k:0 for k in CATEGORY_CAP}
    core_done = 0
    for q,(xp,c) in CORE.items():
        if rng.random() < p:
            cat[c] += xp; core_done += 1
    # bonuses only accrue in categories whose core quest was done
    if cat["MIND"]:                      # extra problems beyond the first
        for _ in range(rng.choice([0,1,1,2,2,3])):
            cat["MIND"] += rng.choice([15,25,25,40])
        if rng.random()<0.35: cat["MIND"] += 20        # a revisit
    if cat["CRAFT"] and rng.random()<0.30: cat["CRAFT"] += 50   # shipped unit
    if cat["CAREER"]:
        cat["CAREER"] += 10*rng.choice([0,0,1,2,3,4])  # extra quality apps
    if cat["BODY"] and rng.random()<0.55: cat["BODY"] += 20     # 10k steps
    if rng.random() < p*0.8: cat["LEARN"] += 25*rng.choice([0,1,1,2])  # office blocks
    if rng.random() < p:     cat["MAINT"] += 20
    total = sum(min(v, CATEGORY_CAP[k]) for k,v in cat.items())
    return min(total, DAILY_CAP), core_done

def simulate(days=120, p=0.85, seed=1):
    rng = random.Random(seed); tot=0; out=[]; cores=0
    for d in range(1,days+1):
        x,c = realistic_day(rng,p); tot+=x; cores+=c; out.append((d,x,tot))
    return out, cores/(days*6)

print("=== CORE STRUCTURE ===")
for q,(xp,c) in CORE.items(): print(f"  {q:<10} {xp:>4} XP  [{c}]")
print(f"  {'TOTAL':<10} {CORE_TOTAL:>4} XP   (unit of account preserved from v1)")
print(f"  daily cap {DAILY_CAP}  = {DAILY_CAP/CORE_TOTAL:.2f}x an honest full day")
print(f"  engines (career/dsa/build/training) = 400 = {400/CORE_TOTAL:.0%} of a day")
print(f"  guardrails (sleep/attention)        = 100 = {100/CORE_TOTAL:.0%} of a day")
print(f"  sum of category caps {sum(CATEGORY_CAP.values())} -> daily cap binds first: "
      f"{sum(CATEGORY_CAP.values())>DAILY_CAP}")

print("\n=== ARC OUTCOMES ===")
print(f"{'perf':>6} {'xp/day':>7} {'total':>7} {'L@30':>5} {'L@60':>5} {'L@90':>5} {'L@120':>6}")
for p in [0.50,0.60,0.70,0.85,0.95,1.00]:
    runs=[]
    for s in range(60):
        ser,_ = simulate(p=p,seed=s); cum={d:t for d,x,t in ser}
        runs.append((cum[30],cum[60],cum[90],cum[120]))
    m=[statistics.mean(r[i] for r in runs) for i in range(4)]
    lv=[level_at(x)[0] for x in m]
    print(f"{p:>6.0%} {m[3]/120:>7.0f} {m[3]:>7.0f} {lv[0]:>5} {lv[1]:>5} {lv[2]:>5} {lv[3]:>6}")

print("\n=== DAILY XP DISTRIBUTION AT 85% ===")
ser,cr = simulate(p=0.85,seed=42)
xs=sorted(x for _,x,_ in ser)
print(f"  min {xs[0]}  p25 {xs[30]}  median {xs[60]}  p75 {xs[90]}  max {xs[-1]}")
print(f"  days at the 700 cap: {sum(1 for x in xs if x>=DAILY_CAP)} / 120")
print(f"  -> cap should bind rarely (a ceiling, not a wall)")

print("\n=== ANTI-GAMING ===")
print(f"  honest full day            {CORE_TOTAL}")
print(f"  hard cap                   {DAILY_CAP}  (+{DAILY_CAP-CORE_TOTAL}, {DAILY_CAP/CORE_TOTAL-1:.0%})")
print(f"  first DSA unit / 2nd unit  100 / 25  = {100/25:.0f}x")
print(f"  first app / each extra     100 / 10  = {100/10:.0f}x")
print(f"  MVD floor 35 = {35/CORE_TOTAL:.0%} of a day (protects streak, not level)")

print("\n=== 'DAY CLOSED' EFFECT (no XP after 03:00) ===")
print("  sleep target 02:00 + 60 min grace -> quests unavailable 03:00-04:00 rollover")
print("  => working past 03:00 earns zero. Stronger than an XP penalty and no shame.")
