// Content for the in-app Guide page. Every phase of the hub update adds its
// entry to WHATS_NEW (newest first) and a section here when it adds a screen.

export type WhatsNewEntry = { date: string; title: string; body: string };

export const WHATS_NEW: WhatsNewEntry[] = [
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
    ],
  },
  {
    id: "plan",
    title: "Plan",
    summary: "Where your tasks live (home dashboard only).",
    points: [
      "Add a task with a name, an optional easier version for low-energy days, a bucket, and optionally how many minutes it takes.",
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
    summary: "Your to-do list at the top, then any other lists you keep.",
    points: [
      "Create lists, give them categories, and drag them into the order you like.",
      "Check items off; finished items stay out of the way.",
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
