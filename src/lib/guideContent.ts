// Content for the in-app Guide page. Every phase of the hub update adds its
// entry to WHATS_NEW (newest first) and a section here when it adds a screen.

export type WhatsNewEntry = { date: string; title: string; body: string };

export const WHATS_NEW: WhatsNewEntry[] = [
  {
    date: "2026-11-01",
    title: "Points for starting, and a welcome back",
    body: "Starting counts now, not just finishing. Tap Start 5 minutes on a task for +1 point (up to three different tasks a day). Finishing a task pays by its size: +2 for ten minutes or less, +3 up to 30, +5 up to an hour, +8 beyond that; the easier low-energy version earns the full amount. If you’ve had two or more days with no points at all, your first start or finish earns a one-time +5 welcome back. Rest, the energy check-in, Out tonight and the journal never earn or cost points. Each habit can now belong to a part of the day, so it’s suggested at the right time. Your existing points and history are untouched.",
  },
  {
    date: "2026-10-31",
    title: "Tasks, collections, and one card at a time",
    body: "Capture anything in one line and sort it later — no verb, time or area required. A time at the end (like “call the dentist 10m”) is picked up for you. Things to keep (groceries, movies, books, gift ideas) go into collections. In the afternoon and evening you see one card at a time, with the first step spelled out and a 5-minute Start. Not feeling it? “Not this one” deals you a smaller task. Collections show up where they help: a film on a low-energy evening, your next book at Shutdown. Any open to-dos you had were moved into your Inbox. (Home dashboard only.)",
  },
  {
    date: "2026-10-30",
    title: "Your day now has real time blocks",
    body: "With the home dashboard on, each part of your day gets its own screen. Launch leads with the one priority you set the night before. Work stays quiet, with an optional ten-minute lunch task. Transition is a one-tap energy check-in, a twenty-minute rest, and one easy way to start. Evening shows Learning, Body, Home and Inbox, with easier versions on low-energy days. Shutdown is three small steps: log the day, tidy the Inbox, plan tomorrow. Tomorrow holds about as many tasks as you finished today; extras wait in Someday. And “Out tonight” collapses the evening and protects your streak. There’s a new Plan page for your tasks.",
  },
  {
    date: "2026-10-29",
    title: "A new home dashboard (optional)",
    body: "Turn on “Home dashboard” in Settings and your home page becomes a calm view of your day: a greeting, a daily spark, one thing to do right now, your daily brief, today’s timeline, what’s coming up, and a short list of things worth a look. After 8pm the page warms and darkens. Your daily brief’s local section now follows the city you set in Settings. The classic Overview is always still at /overview.",
  },
  {
    date: "2026-10-28",
    title: "Link Google calendars too",
    body: "Settings > Calendar now takes more than one link. Add your iCloud calendar and any Google calendars (using Google’s “secret address in iCal format”) and they’re shown together.",
  },
  {
    date: "2026-10-28",
    title: "Settings foundation, calendar link, and phone-friendly sizing",
    body: "Settings now has Your day (time zone and the times your day shifts gears), a place to link your calendar, your Daily brief city, notification choices, and a New features list where everything starts switched off. Buttons and fields are bigger on phones, and screens respect the notch and home bar.",
  },
];

export type GuideSection = { id: string; title: string; summary: string; points: string[] };

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "overview",
    title: "Overview",
    summary: "Your home screen: a quick look at today across the tabs you use.",
    points: [
      "Shows only the tabs you’ve turned on in Settings.",
      "Tap “View all” on any card to open that tab.",
    ],
  },
  {
    id: "dashboard",
    title: "Home dashboard",
    summary: "An optional new home page, switched on in Settings → New features. Your classic Overview stays at /overview.",
    points: [
      "Greeting: one sentence that changes through the day — your workout, an evening plan, or how many things are on deck.",
      "Daily spark: a quote, question, thought experiment, word or fact, new each day and never repeated within a year. Tap Save to keep it in Saved sparks; over time you’ll see a little more of the kinds you save.",
      "Now: the one next thing for this part of your day. Only this card carries the accent color. What it shows depends on the block — see “Time blocks” below.",
      "Daily brief: open before work, folded into one line after. Tap Play to listen. Your alarm Shortcut keeps working as before.",
      "Today: your day’s blocks with calendar events in between. Finished parts fade.",
      "Coming up: the next few days — events, bills and cleaning — with a note on what each needs.",
      "Worth a look: at most three gentle nudges, like a bill due soon or a streak waiting on one habit.",
      "After 8pm (or whenever your Shutdown time is) the page turns darker and warmer until Launch.",
    ],
  },
  {
    id: "time-blocks",
    title: "Time blocks and planning",
    summary: "Your day in five parts, using the times in Settings → Your day. Part of the home dashboard.",
    points: [
      "Launch: the one priority you set last night comes first, then your workout and habits.",
      "Work: mostly quiet. Around lunchtime you may see one optional task of ten minutes or less.",
      "Transition: tap High or Low for your energy (it never affects points), take a twenty-minute rest or skip it, then get one easy way to start.",
      "Evening: your next task, with Learning, Body, Home and Inbox listed below. On a low-energy evening you’ll see each task’s easier version if it has one.",
      "Shutdown: log the day, tidy the Inbox (move things to a bucket, Someday, or remove them), and plan tomorrow.",
      "Tomorrow’s plan holds about as many tasks as you finished today — never fewer than one. Anything more is saved in Someday instead of piling up. Tap ★ Lead to choose the one that starts tomorrow.",
      "Out tonight: switches on by itself when your calendar has an evening event, or tap it yourself. The evening shrinks to a one-line log, and the day counts toward your streak either way.",
      "Capture: the box at the bottom of the home page adds anything to your Inbox in one line.",
      "One card at a time: in the afternoon and evening the Now card shows a single task, its first step, and a 5-minute Start. Tap Start for a five-minute timer — finishing is a separate tap. “Not this one” sets it aside for today and deals a smaller task. The full list is tucked under “Everything on your list”.",
      "Collections in context: on a low-energy evening you may be offered the next film or show from your movies list, and at Shutdown the next book from your books list.",
    ],
  },
  {
    id: "plan",
    title: "Plan",
    summary: "Where your tasks live (home dashboard only).",
    points: [
      "A task is one line. Type it and tap Add — nothing else is required. A time at the end (like “10m”) becomes its time estimate.",
      "When you have a moment, Add details: an area, minutes, the energy it needs, the best part of the day, a first step, or an easier version for low-energy days. Unsorted Inbox items can still come up as cards.",
      "At Shutdown (or here) you can also file an Inbox item into one of your collections, save it for Someday, or remove it.",
      "Tomorrow shows what’s planned and how much room is left. Someday holds anything you want to keep but not do soon.",
      "Use More… on a task to move it, plan it for tomorrow, make it tomorrow’s lead, save it for Someday, or remove it.",
      "Your habits, cleaning, weekly tasks and workouts stay in their own tabs; due ones also show in the Body and Home buckets.",
    ],
  },
  {
    id: "points",
    title: "Points",
    summary: "Daily habits and weekly tasks earn points you can spend on rewards.",
    points: [
      "With the home dashboard on, tasks earn points too: +1 for starting one (up to three a day), and +2 / +3 / +5 / +8 for finishing, by size (10 min or less / up to 30 / up to 60 / longer, and +2 with no time). Each task pays once.",
      "Welcome back: after two or more days with no points, your first start or finish earns a one-time +5.",
      "Never worth points: rest, the energy check-in, Out tonight (it protects your streak), and the journal.",
      "With the dashboard on, each habit has a Part of the day (edit it on this page). A habit is suggested on the Now card in its own part of the day; Anytime habits stay out of the way.",
      "Check off a daily habit once a day, or log a repeatable one as many times as you like.",
      "Weekly tasks reset each week and can have a category.",
      "Keep a streak going by completing at least one daily habit each day.",
      "Spend points on rewards; redeemed rewards move out of your list.",
    ],
  },
  {
    id: "cleaning",
    title: "Cleaning",
    summary: "Recurring cleaning tasks that tell you what’s due and when.",
    points: [
      "Each task repeats every few days or weeks; marking it done resets the clock.",
      "Tasks are grouped by timeframe — due now, this week, next week, this month, later.",
      "Completing a cleaning task earns points too.",
    ],
  },
  {
    id: "exercise",
    title: "Exercise",
    summary: "Workout programs, days and exercises, with sets logged as you go.",
    points: [
      "Build programs made of days, and days made of exercises.",
      "Log weight and reps (or time) for each set; once you’re hitting your target reps, the exercise tells you it’s ready for a heavier weight.",
      "Tag exercises with muscle groups and filter by them; reorder exercises with the arrows.",
    ],
  },
  {
    id: "finance",
    title: "Finance",
    summary: "Debt and savings accounts, projections, and your paycheck plan.",
    points: [
      "Add accounts and log payments or deposits to see projected payoff and savings dates.",
      "The paycheck plan splits each paycheck into bills, savings and spending, with a checklist.",
      "Marking a bill linked to a debt account paid also logs the payment on that account.",
    ],
  },
  {
    id: "lists",
    title: "Lists",
    summary: "Your to-do list at the top, then any other lists you keep. With the home dashboard on, these are your Collections.",
    points: [
      "Create lists, give them categories, and drag them into the order you like.",
      "Check items off; finished items stay out of the way.",
      "With the home dashboard on, tell each list what it’s for — Groceries, Movies & shows, or Books — so it appears at the right moment. Things to do live on the Plan page instead.",
    ],
  },
  {
    id: "year-review",
    title: "Year in review",
    summary: "A running log of what happened this year, by category.",
    points: [
      "Create categories (trips, books, concerts…) and add entries with dates, people and places.",
      "Switch years with the pills at the top.",
    ],
  },
  {
    id: "emotion-checkin",
    title: "Emotion check-in",
    summary: "A quick, private note about how you’re feeling.",
    points: [
      "Note what happened, then find the feeling on the emotion wheel and add a sentence or two.",
      "Today’s check-ins are listed on the page, and each one earns points."
    ],
  },
  {
    id: "news",
    title: "News",
    summary: "A live feed and a short daily brief you can listen to.",
    points: [
      "Open any story for a summary and a link to the full article.",
      "Play the daily brief for a spoken run-through; stories you’ve heard won’t repeat.",
      "In Settings you can make a private link so an iPhone Shortcut reads your brief when your alarm stops.",
    ],
  },
  {
    id: "settings",
    title: "Settings",
    summary: "Make the app yours.",
    points: [
      "Appearance: light or dark, and the background color.",
      "Your day: your time zone and the times your day shifts gears. Everything in the app uses this time zone to decide what “today” means.",
      "Calendar: link iCloud and Google calendars (stored encrypted, read-only), name them, and preview your next 7 days with everything merged.",
      "Your name: what the dashboard greeting calls you.",
      "Daily brief city: the local section of your brief. Chicago uses hand-picked Chicago outlets; any other city uses a Google News search, so add the state (for example “Austin, TX”) to avoid mix-ups.",
      "New features start switched off for everyone — turn them on here when you want them.",
    ],
  },
];
