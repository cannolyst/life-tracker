// Content for the in-app Guide page. Every phase of the hub update adds its
// entry to WHATS_NEW (newest first) and a section here when it adds a screen.

export type WhatsNewEntry = { date: string; title: string; body: string };

export const WHATS_NEW: WhatsNewEntry[] = [
  {
    date: "2026-11-09",
    title: "A home page built around your day",
    body: "The home page now answers the questions you open it with. A capture bar runs across the top, always ready: type, press Enter, and it lands in your Inbox (press / anywhere on the page to jump to it), with a running “done · to go” count beside it. Under your Now card is a new Today’s list with the tasks planned for today and your habits, which you can tick off right there. A new Done today card shows what you’ve finished and the points it earned. Today and Coming up sit together in the middle, and the quieter things — goals, spark, brief and journal — sit lower on the right. You can still rearrange everything with Customize. The other pages follow the same idea on a wide screen: the thing you work from sits on the left, supporting lists in the middle, and totals, history and settings on the right, and the “add” forms (a task, a category, a list, a transaction) now fold away into a single “+ Add” row until you need them.",
  },
  {
    date: "2026-11-08",
    title: "A sidebar and a wider home page on big screens",
    body: "On a computer or other wide screen, the menu is now a sidebar down the left with every page in it, and the page you’re on is highlighted. On a really wide screen the home page also lays out in three columns of cards — your Now card and Capture box on the left, your day (Today, Coming up, Brief) in the middle, and flags, the spark, goals and journal on the right — so you can see more without scrolling. Most other pages — Plan, Points, Cleaning, Exercise, Finance, Lists, Year in review, Life admin, Goals, Journal, Guide, Settings, Overview and your account pages — also spread into columns on a wide screen. The Sunday reset, Emotion Check-In and News stay in one column because they read top to bottom. Every page with cards also has a Customize button (top right, wide screens only): drag cards between up to three columns, nudge them with the arrow buttons, or hide the ones you don’t want. Leave a column empty and the others stretch to fill the screen. Each page remembers its own arrangement, it saves as you go, and Reset layout puts a page back. On a phone nothing changes: it’s still one column with the menu button at the top.",
  },
  {
    date: "2026-11-07",
    title: "A tour, a complete Guide, and switches for each part",
    body: "The first time you open the new home page, a short welcome tour walks you through it (skip it, or replay it from the top of the Guide). The Guide now has a section for every page, each one saying what it’s for, how to use it and whether it earns points. In Settings → New features you can switch off any part of the dashboard you don’t want: Daily spark, Evening tone, Sunday reset, Life admin, Goals and Photo journal. They come on with the dashboard, and switching one off hides it everywhere — pages, menu links, home-page cards and notifications — without deleting anything you’ve saved.",
  },
  {
    date: "2026-11-06",
    title: "Home Screen app and notifications",
    body: "Life Tracker can now live on your iPhone Home Screen and open full screen, and it can send a few gentle notifications — never more than four a day: urgent flags (bills or free trials about to charge), the Sunday reset, a lunch check-in on weekdays when there’s a small task waiting, and a Shutdown nudge at 8:30pm. Each has its own switch and time in Settings, and “Out tonight” silences the evening one. Turn them on per device in Settings → Notifications. The Guide now has step-by-step instructions for an iPhone Shortcuts automation that opens the app at the start of your Transition.",
  },
  {
    date: "2026-11-05",
    title: "A photo journal",
    body: "The last step of Shutdown is now a short journal entry: the day’s facts drafted for you (your events, what you finished, your workout, points, the weather and one headline), one photo from your camera roll, one prompt, and an optional mood. If the photo isn’t from today you’ll get a gentle note, and with no photo you can use the weather or a map instead. Photos are shrunk on your phone before they upload and are stored privately — they can only be opened while you’re signed in. Journal entries earn no points. An unfinished entry can be finished until noon the next day, and your Journal page shows every month as a photo grid. “On this day” looks back a month and a year on your home page, the monthly review shows last month’s photos, and your Year in review gets journal highlights. (With the home dashboard on.)",
  },
  {
    date: "2026-11-04",
    title: "Goals",
    body: "Pick up to three goals at a time. Each has a one-line why, a deadline between a month and a year out, and a next step that becomes a card on its own (with the why shown under it). There are three kinds: Finish (a finish line with milestones), Rhythm (a set number of times a week) and Ongoing (keep something going). Progress tracks itself from the habits you link, your logged workouts, and tasks tagged to the goal — and pacing is worked out from the deadline, in calm words like “On pace” or “A little behind”. A slim progress strip sits under your Now card. When a deadline arrives you choose: Done (celebrate, and it joins your Year in review), Extend, or Retire with no penalty. Short goals are checked in the Sunday reset; longer ones in the monthly review. (With the home dashboard on.)",
  },
  {
    date: "2026-11-03",
    title: "Life admin: chores that recur, subscriptions, and people",
    body: "A new Life admin page keeps track of the things that come around on their own. Recurring items (renew registration, change the furnace filter) show up in Coming up two weeks ahead, then become an evening card; Done resets the clock. Subscriptions and free trials are flagged before they charge — manual ones three days out, trials two days before they convert. People get birthdays in Coming up a week ahead, their own gift-ideas list, and an optional “see them every X weeks” nudge that resets itself when a calendar event mentions their name. On the first Sunday of the month the reset adds a monthly review: points by area, next month’s life admin and bills, and a subscription audit. Your Finance bills can be marked Auto or Manual. (With the home dashboard on.)",
  },
  {
    date: "2026-11-02",
    title: "The Sunday reset, and more in your Year in review",
    body: "On Sundays your home page offers a ten-minute reset: look back at the week, look ahead at your calendar (with Out tonight nights flagged and open evenings marked), give your bigger tasks a home on those evenings, check the groceries, and clear the decks — sort the Inbox, review Someday, and drop anything that’s gone stale. Finishing earns +5 points, once a week. Your Year in review has a new “in numbers” card: tasks started and finished, comebacks, Out tonight nights, how often each part of the day’s habits got done, and the highlight from each reset. (With the home dashboard on.)",
  },
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
      "Points: this page only shows what you’ve earned; nothing here earns points itself.",
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
      "Points: the dashboard itself earns nothing. What you do from it — starting and finishing tasks, ticking habits — earns points as described in Points and Plan.",
      "The first time you open the dashboard a short welcome tour walks through the home page. You can skip it, and replay it any time from the button at the top of this Guide.",
    ],
  },
  {
    id: "sparks",
    title: "Daily spark",
    summary: "One small thing each morning, under your greeting (home dashboard on; can be switched off in Settings).",
    points: [
      "Each day brings a quote, a word worth knowing, a question, a tiny challenge, or an idea to try. You won’t see the same one twice within a year.",
      "Tap Save on any you like. Saved sparks collect on the Saved sparks page, and saving also nudges the kinds you like toward the top over time.",
      "In your journal you can swap in the prompt “Where did today’s spark take you?” on days you opened the spark.",
      "Points: none. The spark is just for you.",
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
    id: "journal",
    title: "Photo journal",
    summary: "The last step of Shutdown, and a Journal page in the menu (home dashboard on).",
    points: [
      "Each night’s entry starts with facts drafted for you: your calendar events, what you finished, your workout, points earned, the weather in your city, and one headline. Nothing to type unless you want to.",
      "Pick one photo from your camera roll. It’s resized on your phone before it uploads. If the photo was taken on another day you’ll see a gentle note; keep it if it fits. With no photo, choose the weather or a map instead.",
      "One prompt rotates each night. On days you opened the Daily Spark you can swap in “Where did today’s spark take you?”. The mood tag is optional.",
      "Photos are stored privately and only load while you’re signed in. Journaling earns no points and never costs any.",
      "Finish the entry, or Save for later: an unfinished entry can be completed until noon the next day (the home page reminds you in the morning).",
      "Look back: the Journal page shows each month as a photo grid, “On this day” on the home page shows a month and a year ago, and the monthly review includes last month’s photos.",
    ],
  },
  {
    id: "goals",
    title: "Goals",
    summary: "Up to three active goals, from the menu (home dashboard on). Others wait in Someday goals.",
    points: [
      "Each goal has a name, a one-line why, and a deadline between about a month and a year away. The next step you add becomes a task and shows up as a card, with the goal and its why under it.",
      "Finish: add a finish line and milestones; progress is milestones done out of all (or the goal’s tasks, if you add none). Rhythm: pick how many times a week; progress is the weeks you hit it out of the full weeks so far. Ongoing: keep something going; progress is how many of the last four weeks had activity.",
      "Choose what counts: any of your habits, your logged workouts, and tasks tagged to the goal. You never have to update progress by hand.",
      "Pacing is judged against the deadline in calm words: Ahead, On pace, A little behind, or Worth a fresh look. Goals earn no points of their own.",
      "At the deadline you choose: Done (celebrate; it’s saved in your Year in review), Extend by 30, 60 or 90 days (pacing recalculates), or Retire (no penalty).",
      "The slim strip on your home page shows each active goal as one line and a thin bar. When a Finish goal has no next step waiting, it asks for one.",
      "Goals shorter than about 60 days are checked in the Sunday reset; longer ones in the monthly review.",
    ],
  },
  {
    id: "life-admin",
    title: "Life admin",
    summary: "The things that come around on their own. Open it from the menu (home dashboard on).",
    points: [
      "Recurring: things like “renew registration” or “change the furnace filter”, with how often they come around and when you last did them. Two weeks before one is due it appears in Coming up; once it’s due it becomes your evening card. Done resets the clock; Not tonight lets it wait until tomorrow.",
      "Subscriptions & trials: add what you pay for, how often, the next charge, and whether it pays itself. Ones you pay by hand are flagged three days before they charge. Mark something as a free trial and you’re flagged two days before it starts charging, with the price. Your Finance bills stay separate from this list.",
      "Bills: on the Finance page each bill has an Auto / Manual switch. Manual bills are flagged three days before they’re due; autopay ones aren’t.",
      "People: add a birthday (and year, if you like) and it shows in Coming up a week ahead, with your saved gift ideas. Start a gift-ideas list for anyone. Set “see them every X weeks” and you’ll get a gentle nudge when it’s been a while; it resets when a calendar event mentions their name, or tap “I saw them today”.",
      "Points: none. Life admin is housekeeping, so it never earns or costs points.",
    ],
  },
  {
    id: "sunday-reset",
    title: "Sunday reset",
    summary: "About ten minutes to close one week and set up the next. It shows on your home page on Sundays and is always at Plan → Sunday reset.",
    points: [
      "Look back: your points, active days and streak for the week just ended, your best day, and one highlight you choose (a suggestion is filled in).",
      "Look ahead: the next seven days from your calendar. Nights with an evening plan, or that you marked Out tonight, show as “Out tonight”; the rest are “Open evening”.",
      "Plan the week: give your bigger tasks a home on the open evenings, or tap “Suggest my biggest tasks”.",
      "Groceries: check off what you have and add what you need. Mark one of your lists as Groceries on the Lists page.",
      "Clear the decks: sort the Inbox, bring back or drop Someday items, and keep, shelve or drop anything that’s sat untouched for three weeks.",
      "Finishing is worth +5 points, once a week. You can finish without doing every step.",
      "Monthly review: on the first Sunday of the month the reset adds steps — your points by area for the last 30 days compared with the 30 before, next month’s life admin, bills and subscription charges, a subscription audit (keep or cancel each one), and a progress check on your longer goals. Open it any other time with “Add the monthly review”.",
      "Goals: if you have goals shorter than about 60 days, the Sunday reset adds a “Check your goals” step for them.",
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
      "Points: starting a task (the 5-minute Start) earns +1, up to three different tasks a day. Finishing earns +2 for ten minutes or less, +3 up to 30, +5 up to an hour, +8 beyond that, and the easier low-energy version pays the same. After two or more days with no points, your first start or finish also earns a one-time +5 welcome back.",
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
      "Points: logging sets doesn’t earn points by itself. If you keep a “Workout” habit on the Points page, ticking it does.",
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
      "Points: none. Money pages never earn or cost points.",
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
      "Points: none. Checking things off a list is just for you.",
    ],
  },
  {
    id: "year-review",
    title: "Year in review",
    summary: "A running log of what happened this year, by category.",
    points: [
      "With the home dashboard on, a “your year in numbers” card shows tasks started and finished, comebacks, Out tonight nights, how often each part of the day’s habits got done, goals completed, and your Sunday-reset highlights. Goals you’ve finished are counted and listed here too, along with journal highlights: how many nights you wrote, how many had a photo, your most common mood, and a few memorable days.",
      "Create categories (trips, books, concerts…) and add entries with dates, people and places.",
      "Switch years with the pills at the top.",
      "Points: none. It’s a record of your year, not a score.",
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
      "Points: none. Reading or listening to the brief never earns or costs points.",
    ],
  },
  {
    id: "notifications",
    title: "Home Screen and notifications",
    summary: "Install the app on your iPhone, turn on a few gentle reminders, and open it automatically each afternoon.",
    points: [
      "Install: open Life Tracker in Safari, tap the Share button, choose Add to Home Screen, then open it from the new icon. iPhone only allows notifications for apps added this way.",
      "Turn on: in the installed app, go to Settings → Notifications and tap “Turn on notifications for this device”. Allow when your phone asks. “Send a test” confirms it works. Each phone or computer is turned on separately.",
      "What you can get — never more than four a day, each with its own switch and time: urgent flags (8:00am, only bills and free trials about to charge), Sunday reset (10:00am Sundays, if it isn’t done), lunch check-in (12:15pm weekdays, only when there’s a small task), Shutdown nudge (8:30pm, skipped if you already logged the day).",
      "“Out tonight” silences anything scheduled for the evening, whether you set it yourself or your calendar did. Tapping a notification opens the right page.",
      "Notifications are checked every 15 minutes, so one can arrive a few minutes after its time.",
      "Open the app at the start of Transition (iPhone Shortcuts): 1) Open the Shortcuts app and tap Automation, then the + button. 2) Choose Time of Day. 3) Set the time to a few minutes after your Transition begins (4:05 PM if yours starts at 4:00), choose Weekly, and pick Monday to Friday. 4) Tap Next, then Add Action, search for Open App, and choose Life Tracker (the Home Screen app). 5) Tap Next, set it to Run Immediately instead of Ask Before Running, and tap Done. If Life Tracker isn’t in the app list, add it to the Home Screen first and try again.",
      "Points: none. A notification never earns or costs points, and nothing is lost if you ignore one.",
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
      "Notifications: choose what you’d like to hear about and when, and turn them on for each device. See Home Screen and notifications.",
      "New features start switched off for everyone — turn them on here when you want them.",
      "Points: none. Changing a setting never affects your points or history.",
    ],
  },
];
