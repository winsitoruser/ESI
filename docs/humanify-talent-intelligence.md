# Humanify Talent Intelligence

## Product Concept & Strategic Direction

### Positioning

Humanify sebaiknya tidak hanya menjadi **ATS dengan AI Search** atau sekadar **bank data kandidat**.

Arah yang lebih kuat adalah membangun:

> **Humanify Talent Intelligence — Talent Decision Infrastructure**

Humanify membantu HR dan hiring manager menjawab lima pertanyaan utama:

1. **Siapa yang kita butuhkan?**
2. **Siapa yang kita punya?**
3. **Siapa yang paling cocok?**
4. **Siapa yang realistis dapat direkrut?**
5. **Jika kandidat yang sesuai tidak tersedia, requirement apa yang harus diubah?**

---

# 1. Product Vision

Humanify Talent Intelligence dibangun sebagai lapisan intelligence di atas Talent Bank dan ATS.

```text
                  HUMANIFY TALENT INTELLIGENCE

                         ASK HUMANIFY
                              │
                              ▼
                     ROLE INTELLIGENCE
                              │
                   "Siapa yang dibutuhkan?"
                              │
                              ▼
 ┌──────────────────────────────────────────────────────┐
 │                  HUMANIFY TALENT GRAPH               │
 │                                                      │
 │ Candidate │ Employee │ Alumni │ Referral │ Applicant │
 └──────────────────────────────────────────────────────┘
                              │
                              ▼
                    TALENT MATCH ENGINE
                              │
          ┌───────────────────┼──────────────────┐
          ▼                   ▼                  ▼
       FIT SCORE        ACTIONABILITY       CONFIDENCE
          │                   │                  │
          └───────────────────┼──────────────────┘
                              ▼
                      TALENT SHORTLIST
                              │
                              ▼
                  TALENT MARKET SIMULATOR
                              │
                              ▼
                     RECRUITMENT ACTION
                              │
           ┌──────────────────┼──────────────────┐
           ▼                  ▼                  ▼
         ATS              ASSESSMENT          ENGAGE
                              │
                              ▼
                            HIRE
                              │
                              ▼
                  PERFORMANCE / SKILLS
                              │
                              ▼
                  COMPANY TALENT MEMORY
                              │
                              └───────→ memperkaya
                                        Talent Intelligence
```

---

# 2. Humanify Talent Graph

Humanify tidak boleh hanya menyimpan CV sebagai file.

CV hanya menjadi salah satu sumber data untuk membentuk **Living Talent Profile**.

Contoh struktur:

```text
                         ANDI PRATAMA
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
    EXPERIENCE              SKILLS               INTENT
        │                     │                     │
Digital Marketing       Meta Ads 4 yr       Open to opportunity
FMCG                    Google Ads 3 yr      Tangerang
E-Commerce              Analytics 3 yr       Hybrid preferred
                                                     │
                                                     ▼
                                              Salary 9–11 jt

                              │
                  ┌───────────┼───────────┐
                  ▼                       ▼
             ASSESSMENT               HISTORY
             Cognitive 82             Applied 2025
             Marketing 91             Interviewed
             English B2               Silver Medalist
```

Data dapat terus diperbarui melalui:

- CV
- Application
- Interview
- Assessment
- Recruiter notes
- Hiring history
- Employee performance
- Learning history
- Skill validation
- Career interest
- Salary expectation
- Availability
- Candidate self-update

---

# 3. Tiga Skor Utama

Humanify sebaiknya tidak hanya memberikan satu angka **Match Score**.

Gunakan tiga indikator berbeda.

## 3.1 Role Fit

Menunjukkan seberapa cocok kandidat dengan kebutuhan pekerjaan.

Komponen:

- Skill
- Experience
- Role relevance
- Industry experience
- Assessment
- Competency

Contoh:

```text
ROLE FIT
91%
```

---

## 3.2 Actionability

Menunjukkan apakah kandidat realistis untuk direkrut sekarang.

Komponen:

- Expected salary
- Location
- Work preference
- Availability
- Notice period
- Open to opportunity
- Candidate intent

Contoh:

```text
ACTIONABILITY
76%
```

---

## 3.3 Data Confidence

Menunjukkan seberapa terpercaya dan mutakhir data kandidat.

Komponen:

- CV freshness
- Salary verification
- Location verification
- Assessment date
- Availability verification
- Source reliability

Contoh:

```text
DATA CONFIDENCE
84%
```

Sehingga Talent Card dapat menampilkan:

```text
ANDI PRATAMA

Role Fit          91%
Actionability     76%
Data Confidence   84%
```

---

# 4. Evidence-Based Matching

Setiap kesimpulan AI harus memiliki bukti.

Contoh:

| Requirement | Kandidat | Evidence |
|---|---|---|
| Digital Marketing 4+ tahun | Sesuai | 4,7 tahun |
| Meta Ads | Sesuai | Pengalaman di 3 posisi |
| Google Ads | Sesuai | CV + Assessment |
| Leadership | Terbatas | 1 tahun |
| FMCG | Sesuai | 2,5 tahun |
| Tangerang | Sesuai | Area domisili cocok |
| Salary ≤ Rp10 juta | Sesuai | Expected Rp9,5–10 juta |

Humanify harus mampu menampilkan:

### Why Match

Mengapa kandidat direkomendasikan.

### Potential Gap

Apa yang belum memenuhi requirement.

### Uncertainty

Apa yang belum memiliki cukup bukti.

Contoh:

> Tidak ditemukan bukti yang cukup mengenai pengalaman TikTok Ads.

Bukan:

> Kandidat tidak memiliki skill TikTok Ads.

---

# 5. Humanify Evidence Graph

Setiap claim memiliki sumber.

```text
CLAIM
   │
   ├── Source
   ├── Evidence
   ├── Date
   ├── Confidence
   └── Verification Status
```

Contoh:

```text
CLAIM
Meta Ads — 4 tahun

SOURCE 1
CV → PT ABC
Digital Marketing Specialist
2022–2024

SOURCE 2
Assessment
Digital Performance Marketing
Score: 88
```

Tujuannya adalah membuat AI Humanify **explainable**, bukan black box.

---

# 6. Humanify Role Blueprint

Sebelum melakukan pencarian kandidat, Humanify membantu HR memahami kebutuhan posisi.

Input:

> Cari Marketing Manager Tangerang, salary sekitar Rp10 juta, pengalaman 5 tahun, digital marketing, preferably FMCG.

Humanify mengubahnya menjadi:

| Parameter | Interpretasi |
|---|---|
| Role | Marketing Manager |
| Location | Tangerang |
| Salary | ± Rp10 juta |
| Experience | ≥ 5 tahun |
| Core Skill | Digital Marketing |
| Industry | FMCG preferred |
| Seniority | Manager |
| Leadership | Belum jelas |
| Team Size | Belum tersedia |
| Work Mode | Belum tersedia |

Humanify juga dapat memberikan **Role Health Check** apabila requirement belum lengkap.

---

# 7. Requirement Intelligence

Humanify harus membedakan requirement menjadi:

```text
MUST HAVE
──────────
Digital Marketing
Salary <= Rp10,5 juta
Area Tangerang / commuting radius

STRONGLY PREFERRED
──────────────────
3+ years relevant experience
Performance Marketing

PREFERRED
─────────
FMCG
Meta Ads
Google Ads

NICE TO HAVE
────────────
Leadership
TikTok Ads
SEO
```

Recruiter dapat mengubah setiap requirement menjadi:

- Must Have
- Strongly Preferred
- Preferred
- Nice to Have
- Exclude

---

# 8. Conversational Talent Search

Humanify harus mendukung natural-language search.

Contoh:

> Cari Marketing Manager sekitar Tangerang, salary maksimal Rp10 juta, strong digital marketing dan kalau bisa dari FMCG.

Humanify kemudian menerjemahkannya menjadi structured search.

Flow:

```text
Recruiter Request
        ↓
AI Requirement Understanding
        ↓
Role Blueprint
        ↓
Must Have / Preferred
        ↓
Talent Bank Search
        ↓
Semantic Search
        ↓
Evidence Matching
        ↓
Actionability Filtering
        ↓
Shortlist
```

---

# 9. Semantic Talent Search

Humanify tidak hanya bergantung pada exact keyword.

Contoh:

```text
Facebook Ads
Meta Advertising
Paid Social
Social Advertising
Performance Social
```

Sistem harus memahami bahwa istilah tersebut dapat berkaitan secara semantik.

Search engine sebaiknya menggabungkan:

- Structured filters
- Keyword search
- Semantic search
- Skill ontology
- Evidence matching
- AI reranking

---

# 10. Humanify Talent Market Simulator

Ini dapat menjadi salah satu **signature features** Humanify.

Contoh kebutuhan:

```text
Marketing Manager
Tangerang
Rp10 juta
5 tahun pengalaman
FMCG
Meta Ads
```

Hasil awal:

```text
Exact Match
3 candidates
```

Humanify kemudian mensimulasikan perubahan requirement.

| Scenario | Talent Available |
|---|---:|
| Current Requirement | 3 |
| Salary Rp11 juta | 9 |
| Salary Rp12 juta | 18 |
| Radius +10 km | 14 |
| Experience 5 → 4 tahun | 21 |
| FMCG menjadi Preferred | 36 |

Humanify dapat menjelaskan:

> Salary adalah constraint terbesar. Dengan menaikkan budget dari Rp10 juta menjadi Rp12 juta, talent pool meningkat secara signifikan.

---

# 11. Constraint Intelligence

Humanify dapat menunjukkan faktor mana yang paling mempersempit talent pool.

Contoh:

```text
Talent Pool Impact

Salary <= Rp10m
████████████████████████  -71%

FMCG required
██████████████            -42%

5+ years experience
██████████                -31%

Tangerang only
██████                    -18%
```

Tujuannya adalah membantu HR dan Hiring Manager berdiskusi menggunakan data.

---

# 12. Smart Relaxation

Jika kandidat terlalu sedikit, Humanify tidak hanya mengatakan:

> Kandidat tidak ditemukan.

Sistem memberikan alternatif.

Contoh:

```text
Current exact matches: 2

OPTION A
Tambah radius +10 km
→ 9 candidates

OPTION B
Salary +Rp1 juta
→ 14 candidates

OPTION C
Experience 5 → 4 tahun
→ 18 candidates

OPTION D
FMCG menjadi preferred
→ 31 candidates
```

---

# 13. Candidate Freshness Engine

Bank CV biasanya memiliki masalah data basi.

Humanify harus memberikan **Freshness Score**.

Contoh:

```text
Profile updated       14 days ago
Salary verified       30 days ago
Location verified     30 days ago
Availability verified 7 days ago
CV updated            120 days ago

DATA FRESHNESS
92%
```

---

# 14. Candidate Self-Update

Humanify dapat meminta kandidat memperbarui profil tanpa harus mengirim CV baru.

Contoh data yang diperbarui:

- Current Position
- Current Company
- Current Location
- Expected Salary
- Availability
- Notice Period
- Preferred Role
- Preferred Location
- Work Preference
- Open to Opportunity

Contoh:

```text
Current Position
Marketing Specialist

Current Location
Tangerang

Expected Salary
Rp11.000.000

Availability
30 days

Open to Opportunity
Yes
```

---

# 15. Candidate Intent Layer

Kandidat dapat memiliki status:

```text
🟢 Actively Looking
🟡 Open to Opportunity
⚪ Not Actively Looking
🔴 Do Not Contact
```

Selain itu:

```text
Availability        : 30 days
Expected Salary     : Rp10–12 juta
Preferred Location  : Tangerang / BSD
Work Preference     : Hybrid
Preferred Role      : Digital Marketing
Relocation          : No
Commute Tolerance   : ±60 min
Last Verified       : 14 days ago
```

Dengan demikian Humanify tidak hanya menjawab:

> Siapa yang cocok?

Tetapi:

> Siapa yang cocok dan realistis dapat direkrut sekarang?

---

# 16. Compensation Intelligence

Humanify tidak hanya menyimpan gaji sebagai satu angka.

Contoh:

```text
Current Salary
Rp9.000.000

Fixed Allowance
Rp1.000.000

Variable
Rp1.500.000

Estimated Total Monthly Compensation
Rp11.500.000

Expected Salary
Rp12.000.000

Company Budget
Rp10–12 juta
```

Humanify dapat menampilkan:

```text
COMPENSATION FIT
GOOD FIT
```

Ke depan, dengan data yang cukup, sistem dapat berkembang menjadi salary intelligence.

---

# 17. Commute Intelligence

Lokasi jangan hanya menggunakan filter kota.

Contoh:

```text
Candidate Area
Tangerang

Office
BSD

Estimated Distance
±12 km

Work Mode
Hybrid 3 days

Candidate Preference
Hybrid accepted

LOCATION FIT
Excellent
```

Untuk menjaga privasi kandidat, sistem dapat menggunakan area atau perkiraan commute tanpa mengekspos alamat lengkap.

---

# 18. Talent Rediscovery Engine

Humanify mencari kandidat lama sebelum perusahaan harus mencari kandidat baru dari nol.

Contoh:

```text
57,418 existing profiles
        ↓
1,284 role-related
        ↓
186 relevant
        ↓
43 strong fit
        ↓
17 salary/location fit
        ↓
11 recently verified
        ↓
7 recommended
```

Kandidat yang pernah berada di tahap akhir tetapi tidak direkrut dapat dikategorikan sebagai **Silver Medalist**.

Contoh konteks:

```text
Applied:
Digital Marketing Specialist — 2025

Status:
Final Interview

Reason Not Hired:
Another candidate selected

Recruiter Rating:
4.5 / 5
```

---

# 19. Recruitment Memory

Humanify menyimpan seluruh sejarah interaksi perusahaan dengan kandidat.

Contoh:

```text
2023
Applied — Marketing Executive
Rejected — Position Filled

2024
Approached — Growth Marketing
Candidate Declined — Salary

2025
Profile Updated
Promoted to Senior Marketing

2026
Moved to Tangerang
Salary Updated
Open to Opportunity

Humanify Rediscovered
for Marketing Manager
```

Recruiter baru tetap dapat memahami sejarah hubungan perusahaan dengan kandidat.

---

# 20. Historical Rejection Should Not Become Automatic Penalty

Status pernah ditolak tidak boleh otomatis menurunkan match score.

Penolakan dapat terjadi karena:

- Posisi ditutup
- Budget berubah
- Kandidat lain menerima offer lebih dahulu
- Salary mismatch pada saat itu
- Location mismatch
- Timing
- Hiring freeze

Recruitment History harus dipisahkan dari:

> Talent Suitability.

---

# 21. Candidate 360

Halaman utama kandidat sebaiknya tidak dimulai dari CV.

Contoh:

```text
┌─────────────────────────────────────┐
│ ANDI PRATAMA                        │
│ Senior Digital Marketing            │
│                                     │
│ FIT              92%                │
│ ACTIONABILITY    88%                │
│ CONFIDENCE       94%                │
│                                     │
│ ✓ Salary Fit                        │
│ ✓ Location Fit                      │
│ ✓ Available                         │
│ ✓ Core Skill Match                  │
│ ⚠ Leadership evidence limited       │
│                                     │
│ WHY MATCH                           │
│                                     │
│ Digital Marketing      Strong       │
│ Meta Ads               Strong       │
│ Google Ads             Strong       │
│ Analytics              Strong       │
│ FMCG                    Medium       │
│ Leadership              Limited     │
│                                     │
│ [Evidence] [History] [Assessment]   │
│                                     │
│ [Shortlist] [Contact] [Assess]      │
└─────────────────────────────────────┘
```

CV menjadi salah satu tab pendukung.

---

# 22. Talent Passport

Humanify dapat mengembangkan portable talent profile.

Isi:

- Verified Experience
- Verified Education
- Verified Skills
- Assessment
- Certification
- Work Preference
- Career Interest
- Salary Preference
- Availability
- Location Preference

Candidate dapat mengontrol informasi mana yang dapat dibagikan.

---

# 23. Privacy & Consent Center

Candidate harus memiliki kontrol terhadap data.

Contoh:

```text
YOUR DATA

Profile       ✓
CV            ✓
Assessment    ✓

Shared With
PT ABC

Purpose
Recruitment

Talent Pool
Allowed

Recruitment Contact
Allowed

[Update Data]
[Change Preferences]
[Withdraw Consent]
[Request Deletion]
```

Privacy-by-design harus menjadi bagian dari arsitektur sejak awal.

---

# 24. Unified Internal + External Talent Search

Humanify tidak hanya mencari kandidat eksternal.

Search dapat mencakup:

```text
             HUMANIFY
                 │
       ┌─────────┼─────────┐
       │         │         │
       ▼         ▼         ▼
   Candidate   Employee   Alumni
     Bank        Bank      Bank
       │         │         │
       └─────────┼─────────┘
                 ▼
            AI Matching
                 │
                 ▼
          Unified Talent Pool
```

Untuk satu posisi, hasil bisa berisi:

- External Candidate
- Existing Employee
- Former Employee / Alumni
- Referral
- Previous Applicant

---

# 25. Build vs Buy Talent Intelligence

Humanify dapat membantu perusahaan membandingkan external hiring dengan internal development.

Contoh:

| Option | Fit | Readiness |
|---|---:|---|
| External Candidate A | 94% | 30 days |
| External Candidate B | 91% | Immediate |
| Internal Employee C | 82% | 2 skills missing |
| Internal Employee D | 78% | 3 skills missing |

Humanify dapat menunjukkan trade-off:

```text
BUY TALENT
External Hiring

vs.

BUILD TALENT
Internal Development
```

Humanify tidak mengambil keputusan otomatis, tetapi memberi bukti untuk pengambilan keputusan manusia.

---

# 26. Build / Buy / Borrow

Untuk kebutuhan project atau temporary workforce:

```text
BUILD
Upskill internal employee

BUY
External permanent hiring

BORROW
Contract / project talent
```

Contoh:

> Butuh 3 Data Analyst untuk project selama 6 bulan.

Humanify dapat menunjukkan:

```text
BUILD
2 internal employees potentially upskillable

BUY
14 external candidates available

BORROW
Contract talent pool available
```

---

# 27. Team Capability Intelligence

Humanify dapat menganalisis skill yang sudah dimiliki sebuah tim.

Contoh:

```text
SEO                     Strong
Content                 Strong
Meta Ads                Strong
Google Ads              Medium
Data Analytics          Weak
Marketing Automation    Weak
```

Ketika membuka posisi baru, Humanify dapat menyarankan talent yang melengkapi capability gap tim.

Gunakan konsep:

> **Capability Contribution**

bukan sekadar subjective culture fit.

---

# 28. Hire-to-Performance Loop

Humanify tidak berhenti ketika kandidat menjadi employee.

```text
Candidate
    ↓
Hire
    ↓
Onboarding
    ↓
Probation
    ↓
Performance
    ↓
Skill Development
    ↓
Career Movement
```

Outcome seperti:

- Probation result
- Performance
- Skill validation
- Retention
- Career progression

dapat memperkaya talent intelligence perusahaan.

---

# 29. Company Talent DNA

Setiap perusahaan memiliki definisi capability yang berbeda.

Contoh:

## Company A — Marketing Manager

```text
Performance Marketing
Analytics
Growth
Experimentation
```

## Company B — Marketing Manager

```text
Brand
Creative
Campaign
Agency Management
```

Humanify dapat memahami role context perusahaan berdasarkan:

- Role architecture
- Competency
- Assessment
- Job-relevant performance outcome
- Skill validation

Tujuannya bukan belajar dari siapa yang “disukai recruiter”, tetapi dari data pekerjaan yang relevan.

---

# 30. Company Talent Memory

Seiring penggunaan, Humanify membangun organizational memory.

Data yang dapat dipelajari:

- Requirement history
- Hiring history
- Candidate interaction
- Role competency
- Assessment outcome
- Probation outcome
- Skill gap
- Performance
- Hiring cycle

Dengan demikian sistem menjadi lebih relevan bagi perusahaan dari waktu ke waktu.

---

# 31. Conversational Talent Analyst

Humanify dapat dibuat seperti seorang talent analyst.

Contoh percakapan:

**Recruiter**

> Cari Marketing Manager Tangerang sekitar Rp10 juta.

**Humanify**

> Ditemukan 28 kandidat relevan. Apakah Anda ingin memprioritaskan Performance Marketing, Brand Marketing, atau Trade Marketing?

**Recruiter**

> Performance Marketing.

**Humanify**

> Tersisa 14 kandidat. Enam memiliki pengalaman Meta Ads + Google Ads.

**Recruiter**

> Yang pernah FMCG.

**Humanify**

> Ada 3 strong match. Jika FMCG diubah dari wajib menjadi preferred, tersedia 11 strong match.

Ini membuat AI terasa seperti decision-support assistant, bukan chatbot tambahan.

---

# 32. Product Architecture

Talent Graph sebaiknya menjadi core engine.

```text
                    HUMANIFY CORE DATA

                      TALENT GRAPH
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
 HUMANIFY RECRUIT    HUMANIFY TALENT     HUMANIFY PEOPLE
      ATS             INTELLIGENCE        INTELLIGENCE
       │                   │                   │
       ▼                   ▼                   ▼
 Recruitment           Matching           Workforce
 Workflow              Search             Planning
 Assessment            Rediscovery        Skills
 Interview             Feasibility        Mobility
 Offer                  Market Data       Succession
```

---

# 33. Data Model

Humanify sebaiknya tidak menggunakan model data yang CV-centric.

Objek inti:

| Object | Function |
|---|---|
| Person | Identity |
| Experience | Employment history |
| Skill | Skills & proficiency |
| Evidence | Source & proof |
| Assessment | Validation |
| Preference | Role/location/work mode |
| Compensation | Salary expectations |
| Intent | Availability & willingness |
| Interaction | Recruiter history |
| Application | Vacancy history |
| Opportunity | Job/project |
| Outcome | Probation/performance |
| Consent | Data permission |
| Company Talent Model | Organizational context |

CV hanya menjadi salah satu **input document** yang mengisi data tersebut.

---

# 34. Humanify Product Modules

| Product | Function | Commercial Model |
|---|---|---|
| Humanify Talent Bank | Candidate data foundation | Core |
| Humanify Talent Search | Semantic & AI search | Add-on |
| Humanify Intelligence | Match, evidence, actionability | Premium |
| Humanify Recruit | ATS workflow | Add-on |
| Humanify Assess | Assessment | Per candidate |
| Humanify Verify | Verification | Per transaction |
| Humanify Market Intelligence | Supply, feasibility, salary | Premium |
| Humanify Performance | Employee performance | Add-on |
| Humanify Skills | Skills intelligence | Add-on |
| Humanify Mobility | Internal opportunities | Enterprise |

---

# 35. Premium Packaging

## Humanify Core

- Talent Bank
- Candidate Profile
- CV Parsing
- Basic Search
- Application History

## Humanify Talent Search

- Natural Language Search
- Semantic Search
- Advanced Filtering
- Candidate Rediscovery
- Talent Pool

## Humanify Intelligence

- Role Blueprint
- Evidence-Based Matching
- Role Fit
- Actionability Score
- Data Confidence
- Requirement Intelligence
- Candidate Freshness
- Talent Market Simulator
- Constraint Intelligence

## Humanify Recruit

- Vacancy
- Recruitment Pipeline
- Interview
- Offer
- Hiring Workflow

## Humanify Assess

- Candidate Assessment
- Competency Assessment
- Technical Assessment
- Assessment Analytics

## Humanify Enterprise Intelligence

- Internal + External Search
- Build vs Buy
- Skills Intelligence
- Workforce Intelligence
- Talent Mobility
- Succession
- Company Talent DNA

---

# 36. Recommended MVP

Untuk fase awal, Humanify tidak perlu membangun seluruh konsep sekaligus.

## MVP Phase 1

### Talent Bank

- CV Upload
- CV Parsing
- Candidate Profile
- Skill extraction
- Experience extraction
- Salary
- Location
- Candidate search

### AI Talent Search

- Natural language query
- Structured filters
- Semantic search
- Candidate ranking

### Explainable Matching

- Why Match
- Gaps
- Evidence
- Data Confidence

### Talent Rediscovery

- Search existing candidate database
- Application history
- Previous recruitment interaction

---

# 37. Phase 2

Tambahkan:

- Candidate Intent
- Candidate Self-Update
- Freshness Score
- Actionability Score
- Salary Fit
- Location / Commute Intelligence
- Role Blueprint
- Requirement Intelligence
- Smart Relaxation

---

# 38. Phase 3

Tambahkan:

- Talent Market Simulator
- Constraint Intelligence
- Internal + External Talent Search
- Employee Skills
- Build vs Buy
- Team Capability Analysis
- Talent Mobility

---

# 39. Phase 4

Tambahkan:

- Hire-to-Performance Loop
- Company Talent DNA
- Workforce Intelligence
- Succession
- Learning Recommendations
- Talent Market Benchmark
- Predictive workforce insights

---

# 40. Unique Differentiators

Fitur standar ATS modern:

- CV Parsing
- Candidate Search
- ATS Pipeline
- AI Candidate Ranking
- Interview Management

Humanify sebaiknya membangun diferensiasi pada:

1. **Living Talent Graph**
2. **Evidence Graph**
3. **Role Fit + Actionability + Confidence**
4. **Candidate Freshness**
5. **Candidate Intent**
6. **Recruitment Memory**
7. **Talent Rediscovery**
8. **Role Feasibility**
9. **Constraint Intelligence**
10. **Talent Market Simulator**
11. **Internal + External Unified Search**
12. **Hire-to-Performance Loop**
13. **Company Talent DNA**
14. **Build / Buy / Borrow Intelligence**

---

# 41. Competitive Moat

Jika Humanify hanya memiliki:

```text
AI CV Parsing
+
AI Candidate Score
+
ATS
```

maka produk akan relatif mudah ditiru.

Tetapi jika Humanify membangun:

```text
Living Talent Graph
       +
Evidence Graph
       +
Candidate Intent
       +
Freshness Engine
       +
Recruitment Memory
       +
Role Feasibility
       +
Talent Market Simulator
       +
Hire-to-Performance Loop
       +
Company Talent DNA
```

maka setiap penggunaan akan memperkaya data dan meningkatkan nilai platform.

---

# 42. Data Flywheel

```text
More Candidate Data
        ↓
Better Talent Graph
        ↓
Better Matching
        ↓
More Recruitment Activity
        ↓
More Assessment & Hiring Outcome
        ↓
Better Company Talent Understanding
        ↓
Better Recommendation
        ↓
More Humanify Usage
        ↓
More Data
```

Ini dapat menjadi salah satu strategic moat Humanify.

---

# 43. Suggested Positioning

Humanify sebaiknya tidak diposisikan hanya sebagai:

> HRIS

atau:

> ATS

atau:

> AI Recruitment Software

Positioning yang lebih kuat:

# Humanify Talent Intelligence

### Find. Understand. Decide.

Alternatif:

> **Know who fits. Know why. Know what it takes to hire them.**

---

# 44. Humanify Core Workflow

```text
DISCOVER
Who is available?
        ↓
UNDERSTAND
Who fits and why?
        ↓
DECIDE
Who should we engage?
What constraints should change?
        ↓
EXECUTE
ATS → Assessment → Interview → Offer → Hire
        ↓
LEARN
Performance → Skills → Outcome
        ↓
IMPROVE
Humanify becomes more relevant
for each organization
```

---

# 45. Key Product Principle

Humanify bukan sistem yang mengambil keputusan hiring secara otomatis.

Humanify adalah:

> **Decision Intelligence System**

yang memberikan:

- Evidence
- Explanation
- Alternatives
- Trade-offs
- Market feasibility
- Talent availability
- Talent insights

Keputusan akhir tetap berada pada recruiter dan hiring manager.

---

# 46. Recommended Signature Features

Jika Humanify harus memulai dengan beberapa fitur yang paling membedakan:

## 1. Talent Rediscovery

> **Your next hire may already be in your database.**

## 2. Evidence-Based Talent Matching

> Bukan hanya match score, tetapi alasan, bukti, gap, dan confidence.

## 3. Talent Market Simulator

> Tunjukkan dampak perubahan salary, radius, skill, experience, atau industry terhadap jumlah kandidat.

## 4. Actionability Intelligence

> Bedakan kandidat yang cocok dari kandidat yang benar-benar realistis untuk direkrut.

## 5. Recruitment Memory

> Bangun organizational memory dari seluruh interaksi perusahaan dengan talent.

---

# Conclusion

Humanify sebaiknya membangun Talent Bank sebagai **data foundation**, tetapi bukan menjual Talent Bank sebagai value utama.

ATS menjadi **execution layer**.

Nilai utama Humanify berada pada:

> **Talent Intelligence + Talent Decision Engine**

yang menghubungkan:

```text
Talent Data
    +
Role Understanding
    +
Evidence
    +
Candidate Intent
    +
Market Feasibility
    +
Recruitment Memory
    +
Hiring Outcome
```

Dengan pendekatan ini, Humanify dapat bergerak dari:

```text
HRIS
  ↓
ATS
  ↓
Talent Intelligence
  ↓
Talent Decision Platform
  ↓
Workforce Intelligence
```

Tujuan jangka panjangnya adalah menjadikan Humanify bukan hanya tempat HR menyimpan data, tetapi platform yang membantu perusahaan memahami:

> **talent apa yang dibutuhkan, siapa yang tersedia, siapa yang sesuai, mengapa mereka sesuai, dan strategi terbaik untuk memenuhi kebutuhan talent perusahaan.**
