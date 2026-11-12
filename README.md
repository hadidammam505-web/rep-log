# Rep Log 🏋️

**A fast, offline, bilingual (Arabic / English) gym tracker — PRs, 1RM estimates, progress charts and a rest timer. Zero dependencies, zero build step.**

### ▶️ [Live demo](https://hadidammam505-web.github.io/rep-log/)

**[العربية](#بالعربي)** · **English below**

---

## Features

- **Log sets in seconds** — exercise autocomplete, weight, reps and optional RPE.
- **Automatic PR detection** — a gold banner (and a buzz on phones) when a set beats your best estimated 1RM.
- **Progress chart** — estimated 1RM per session, drawn on a plain `<canvas>` (no chart library), with your all-time highs marked.
- **Rep-max table** — your heaviest set at every rep count.
- **1RM calculator** — Epley formula with a 60–100 % training-load table.
- **Rest timer** — animated ring, presets from 1 to 5 minutes, beep + vibration when rest is over.
- **Arabic & English** with full right-to-left layout, **kg / lb**, **dark / light** themes.
- **Offline PWA** — installable to your home screen; a service worker caches the app.
- **Your data stays yours** — stored only in your browser (`localStorage`), with JSON export / import for backups.

## Tech

Vanilla HTML, CSS and JavaScript — about 400 lines total.

| File | Role |
|---|---|
| `index.html` | Layout: four tabs (Log, History, Progress, Timer). |
| `style.css` | Design tokens, dark/light themes, RTL-aware layout. |
| `app.js` | State, i18n, PR logic, canvas chart, timer, import/export. |
| `sw.js` | Offline cache (stale-while-revalidate). |
| `manifest.webmanifest` | Installable PWA metadata. |

## Run locally

```bash
git clone https://github.com/hadidammam505-web/rep-log.git
cd rep-log
python -m http.server 8000
# open http://localhost:8000
```

## The math

Estimated one-rep max uses the **Epley** formula:

```
1RM = weight × (1 + reps / 30)
```

A set is a PR when its estimated 1RM is higher than every earlier set of the same exercise.

---

## بالعربي

**Rep Log** تطبيق ويب خفيف لتسجيل تمارين الجيم، يشتغل بدون نت وبالعربي والإنجليزي:

- سجّل المجموعة بثواني: التمرين، الوزن، العدّات، والجهد.
- ينبهك تلقائيًا إذا كسرت **رقمك القياسي** 🏆.
- رسم بياني لتقدّمك في **أقصى تكرار تقديري** لكل تمرين.
- حاسبة أقصى تكرار مع نسب التمرين من 60٪ إلى 100٪.
- مؤقت راحة بصوت واهتزاز.
- وضع ليلي ونهاري، كيلو أو باوند، وتقدر تثبته على شاشة جوالك.
- بياناتك تبقى في جهازك بس، وتقدر تصدّرها وتستوردها.

## License

MIT
