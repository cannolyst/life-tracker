// ---- Data: three-ring emotion wheel (category -> word -> precise word) ----
// Moved verbatim from the handoff mockup — content untouched, just typed.

export type WheelColor = "rose" | "sky" | "amber" | "violet" | "emerald" | "teal";

export type WheelWord = {
  label: string;
  tertiary: string[];
};

export type WheelCategory = {
  key: "mad" | "sad" | "glad" | "scared" | "surprised" | "disgusted";
  label: string;
  color: WheelColor;
  words: WheelWord[];
};

export const WHEEL: WheelCategory[] = [
  {
    key: "mad", label: "Mad", color: "rose",
    words: [
      { label: "Frustrated", tertiary: ["Stuck", "Exasperated"] },
      { label: "Irritated", tertiary: ["Annoyed", "Agitated"] },
      { label: "Resentful", tertiary: ["Bitter", "Begrudging"] },
      { label: "Betrayed", tertiary: ["Disillusioned", "Blindsided"] },
      { label: "Disrespected", tertiary: ["Belittled", "Dismissed"] },
      { label: "Aggravated", tertiary: ["Fed up", "On edge"] },
    ],
  },
  {
    key: "sad", label: "Sad", color: "sky",
    words: [
      { label: "Disappointed", tertiary: ["Let down", "Deflated"] },
      { label: "Lonely", tertiary: ["Isolated", "Left out"] },
      { label: "Hurt", tertiary: ["Wounded", "Rejected"] },
      { label: "Discouraged", tertiary: ["Defeated", "Demoralized"] },
      { label: "Despondent", tertiary: ["Hopeless", "Empty"] },
      { label: "Guilty", tertiary: ["Remorseful", "Ashamed"] },
    ],
  },
  {
    key: "glad", label: "Glad", color: "amber",
    words: [
      { label: "Content", tertiary: ["Peaceful", "Satisfied"] },
      { label: "Proud", tertiary: ["Accomplished", "Validated"] },
      { label: "Relieved", tertiary: ["Unburdened", "Reassured"] },
      { label: "Grateful", tertiary: ["Touched", "Appreciative"] },
      { label: "Optimistic", tertiary: ["Hopeful", "Encouraged"] },
      { label: "Playful", tertiary: ["Giddy", "Mischievous"] },
    ],
  },
  {
    key: "scared", label: "Scared", color: "violet",
    words: [
      { label: "Anxious", tertiary: ["Worried", "Uneasy"] },
      { label: "Insecure", tertiary: ["Self-conscious", "Inadequate"] },
      { label: "Overwhelmed", tertiary: ["Swamped", "Frazzled"] },
      { label: "Exposed", tertiary: ["Vulnerable", "Raw"] },
      { label: "Nervous", tertiary: ["Jittery", "Apprehensive"] },
      { label: "Helpless", tertiary: ["Powerless", "Trapped"] },
    ],
  },
  {
    key: "surprised", label: "Surprised", color: "emerald",
    words: [
      { label: "Confused", tertiary: ["Puzzled", "Disoriented"] },
      { label: "Caught off guard", tertiary: ["Startled", "Unprepared"] },
      { label: "Stunned", tertiary: ["Shocked", "Paralyzed"] },
      { label: "Amazed", tertiary: ["Awestruck", "Astonished"] },
      { label: "Speechless", tertiary: ["Dumbfounded", "Overcome"] },
    ],
  },
  {
    key: "disgusted", label: "Disgusted", color: "teal",
    words: [
      { label: "Disapproving", tertiary: ["Critical", "Contemptuous"] },
      { label: "Judgmental", tertiary: ["Skeptical", "Dismissive"] },
      { label: "Embarrassed", tertiary: ["Humiliated", "Mortified"] },
      { label: "Avoidant", tertiary: ["Withdrawn", "Evasive"] },
      { label: "Repulsed", tertiary: ["Revolted", "Nauseated"] },
    ],
  },
];

export const BODY_ZONES: { key: string; label: string; cx: number; cy: number }[] = [
  { key: "chest", label: "Chest", cx: 100, cy: 95 },
  { key: "throat", label: "Throat", cx: 100, cy: 55 },
  { key: "stomach", label: "Stomach", cx: 100, cy: 140 },
  { key: "jaw", label: "Jaw", cx: 100, cy: 32 },
  { key: "none", label: "Nowhere noticed", cx: 100, cy: 200 },
];

// Ring 2 definitions: full definition + typical trigger.
export const DEFINITIONS: Record<string, { def: string; when: string }> = {
  Frustrated: { def: "Things aren't going the way you want and you feel blocked from fixing it.", when: "effort isn't producing results, or you're stuck waiting on something outside your control." },
  Resentful: { def: "A buildup of unaddressed unfairness — something you did or tolerated without ever bringing it up.", when: "needs went unspoken for a long time and now feel owed." },
  Irritated: { def: "A lower-grade, surface-level version of anger — a small trigger on a short fuse.", when: "you're already tired, stressed, or overstimulated and something minor tips it over." },
  Betrayed: { def: "Someone violated a trust or expectation you didn't know was conditional until it broke.", when: "someone's actions contradicted what you believed was an unspoken agreement." },
  Disappointed: { def: "Reality didn't match an expectation or hope you were quietly holding.", when: "you'd built up hope for a specific outcome without fully realizing it." },
  Lonely: { def: "A gap between the connection you have and the connection you want, even around people.", when: "you're physically with others but not feeling truly seen or known." },
  Hurt: { def: "Someone's words or actions landed as a wound, often unintentionally.", when: "something touched a sensitive spot you didn't know was exposed." },
  Discouraged: { def: "Motivation drains because progress feels invisible or effort feels pointless.", when: "you've hit repeated setbacks in something you care about." },
  Content: { def: "A settled, quiet satisfaction — not excitement, just “this is enough.”", when: "nothing is actively wrong in an ordinary, unremarkable moment." },
  Proud: { def: "A sense that something you did reflects well on who you are or what you value.", when: "effort paid off, especially effort others might not have seen." },
  Relieved: { def: "Tension releasing after a worry or threat resolves.", when: "something you were bracing for turns out okay." },
  Grateful: { def: "Awareness that something good happened that you didn't create alone.", when: "you notice someone else's effort or a stroke of luck on your behalf." },
  Anxious: { def: "A diffuse sense that something bad might happen, without a clear immediate cause.", when: "there's uncertainty about an outcome you care about." },
  Insecure: { def: "Doubt about your own worth, competence, or place in a relationship.", when: "you're comparing yourself to someone else or unsure where you stand with them." },
  Overwhelmed: { def: "The sense that more is coming at you (tasks, emotions, decisions) than you can process at once.", when: "several demands hit at the same time with no clear order to tackle them." },
  Exposed: { def: "Feeling seen in a way you didn't choose or aren't ready for.", when: "right after you've shared something vulnerable, before you know how it landed." },
  Confused: { def: "Conflicting information or feelings that don't add up yet.", when: "something contradicts what you expected or believed." },
  "Caught off guard": { def: "An event happened faster than your ability to prepare for it.", when: "someone brings something up unexpectedly, especially something emotional." },
  Stunned: { def: "A brief freeze in response to something that overloads your capacity to react right away.", when: "big news lands, good or bad, before you've had time to process it." },
  Disrespected: { def: "A sense that your value, boundaries, or authority weren't acknowledged.", when: "someone dismisses your input or treats you as less important than they are." },
  Aggravated: { def: "Irritation that's built up and intensified rather than a single spike.", when: "something keeps recurring after you've already been annoyed by it once." },
  Despondent: { def: "A heavier, more persistent low than ordinary sadness — flatness more than sharp pain.", when: "sadness has gone unaddressed for a while, or meaning feels hard to locate right now." },
  Guilty: { def: "A sense that you did something wrong or caused harm, even unintentionally.", when: "your actions (or inaction) didn't match your own values." },
  Optimistic: { def: "Forward-looking hope that something will work out.", when: "you notice momentum, or a real reason to expect a good outcome ahead." },
  Playful: { def: "A light, unguarded energy, open to fun or silliness.", when: "you feel safe enough to be a little silly or spontaneous." },
  Nervous: { def: "Anticipatory unease about something upcoming.", when: "you're heading into something uncertain or evaluative — a conversation, a decision, a performance." },
  Helpless: { def: "A sense that nothing you do will change the outcome.", when: "you've tried to affect a situation and it hasn't worked, or it's genuinely out of your hands." },
  Amazed: { def: "A jolt of wonder at something exceeding what you expected.", when: "something turns out far better, bigger, or more impressive than anticipated." },
  Speechless: { def: "So struck by something that words don't come.", when: "something lands with more emotional weight than you can process quickly enough to respond to." },
  Disapproving: { def: "A judgment that something isn't right, paired with distancing from it.", when: "someone's behavior conflicts with your values." },
  Judgmental: { def: "A critical read on someone else, often protective of your own standards.", when: "you're comparing someone's choices to what you'd do, or feel threatened by their difference." },
  Embarrassed: { def: "Self-conscious discomfort after feeling exposed in a way that felt undignified.", when: "you did or said something that didn't match how you wanted to be seen, in front of others." },
  Avoidant: { def: "A pull to withdraw or change the subject rather than engage.", when: "a topic feels unsafe, unresolved, or too big to face directly right now." },
  Repulsed: { def: "A strong urge to distance yourself from something that violates a boundary or value.", when: "something crosses a line you hold as non-negotiable." },
};

// Ring 3 definitions: short, precise shade of meaning — no "when", these are refinements of their parent word.
export const TERTIARY_DEFINITIONS: Record<string, string> = {
  Stuck: "Frustration with no visible next move — you want to act but there's nowhere to push.",
  Exasperated: "Frustration worn thin by repetition — you've been patient and patience is running out.",
  Annoyed: "A light, passing irritation that doesn't linger.",
  Agitated: "Irritation with a physical restlessness to it — hard to sit still with.",
  Bitter: "Resentment that's hardened over time into a settled, low-grade edge.",
  Begrudging: "Resentment mixed with reluctant compliance — doing it, but not okay with it.",
  Disillusioned: "Betrayal that's reshaped how you see the person or situation going forward.",
  Blindsided: "Betrayal you had zero warning for — the shock is part of the injury.",
  Belittled: "Disrespect that made you feel small or unimportant.",
  Dismissed: "Disrespect where your input was brushed aside without real consideration.",
  "Fed up": "Aggravation that's reached a limit — done tolerating it.",
  "On edge": "Aggravation sitting just under the surface, ready to spike at the next small thing.",
  "Let down": "Disappointment tied specifically to a person, not just an outcome.",
  Deflated: "Disappointment that drained your energy or motivation along with it.",
  Isolated: "Loneliness with a sense of separation, even in a crowd.",
  "Left out": "Loneliness tied to a specific moment of exclusion.",
  Wounded: "Hurt that feels deep or lasting, not surface-level.",
  Rejected: "Hurt tied to feeling actively unwanted or turned away.",
  Defeated: "Discouragement after a specific attempt or effort came up short.",
  Demoralized: "Discouragement that's starting to erode your belief you can succeed at all.",
  Hopeless: "Despondency with no visible path forward from here.",
  Empty: "Despondency as an absence — flat, hollow, rather than sharply painful.",
  Remorseful: "Guilt paired with genuine regret and a wish to make it right.",
  Ashamed: "Guilt that's turned inward, onto who you are rather than just what you did.",
  Peaceful: "Contentment with a settled, quiet stillness to it.",
  Satisfied: "Contentment tied to something specific being complete or good enough.",
  Accomplished: "Pride tied to effort paying off in a tangible result.",
  Validated: "Pride tied to someone else recognizing what you did or who you are.",
  Unburdened: "Relief where a weight you'd been carrying is now gone.",
  Reassured: "Relief brought on by someone else's words or presence.",
  Touched: "Gratitude with an emotional, almost moved quality to it.",
  Appreciative: "Gratitude expressed as a clear, grounded recognition of what someone did.",
  Hopeful: "Optimism about a specific outcome you're looking forward to.",
  Encouraged: "Optimism sparked by a recent sign of progress.",
  Giddy: "Playfulness with an excited, can't-sit-still quality.",
  Mischievous: "Playfulness with a small urge to stir something up.",
  Worried: "Anxiety focused on a specific possible outcome.",
  Uneasy: "Anxiety that's vague — something feels off but you can't name what.",
  "Self-conscious": "Insecurity focused on how you're coming across right now.",
  Inadequate: "Insecurity about whether you actually measure up.",
  Swamped: "Overwhelm from sheer volume — too much on the list.",
  Frazzled: "Overwhelm that's started to fray your patience and focus.",
  Vulnerable: "Exposure paired with a sense of risk — this could be used against you.",
  Raw: "Exposure that feels tender, like there's no protective layer up yet.",
  Jittery: "Nervousness with a physical, jumpy energy to it.",
  Apprehensive: "Nervousness about something specific you expect to be difficult.",
  Powerless: "Helplessness focused on your own lack of ability to act.",
  Trapped: "Helplessness focused on the situation itself offering no way out.",
  Puzzled: "Confusion that's mild and curious rather than distressing.",
  Disoriented: "Confusion that's thrown off your sense of footing or direction.",
  Startled: "A sharp, involuntary jolt at something sudden.",
  Unprepared: "Caught off guard specifically because you hadn't planned for this.",
  Shocked: "Stun with a sense of disbelief attached.",
  Paralyzed: "Stun severe enough that you can't act or respond yet.",
  Awestruck: "Amazement with a sense of reverence or smallness in front of it.",
  Astonished: "Amazement that something happened at all, more than its scale.",
  Dumbfounded: "Speechless with a layer of disbelief — you can't process it, let alone respond.",
  Overcome: "Speechless from the sheer emotional weight of the moment.",
  Critical: "Disapproval expressed as active fault-finding.",
  Contemptuous: "Disapproval with an edge of looking down on the person or behavior.",
  Skeptical: "Judgment held as doubt — not convinced, withholding trust.",
  Dismissive: "Judgment expressed by discounting something as not worth taking seriously.",
  Humiliated: "Embarrassment that feels public and stripped of dignity.",
  Mortified: "Embarrassment at its most intense — you wish you could disappear.",
  Withdrawn: "Avoidance that's already happened — you've pulled back and gone quiet.",
  Evasive: "Avoidance in motion — actively steering away from the topic.",
  Revolted: "Disgust strong enough to create a physical reaction.",
  Nauseated: "Disgust that registers directly in the body, stomach-first.",
};
