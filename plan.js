// The 12-week plan: every move, every session, and the rules that change by week.
// To revise the plan, edit this file only. app.js reads it and never changes it.
'use strict';

const YT = (id) => 'https://www.youtube.com/watch?v=' + id;
const YTS = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);

// kind: 'load' = weight and reps, 'body' = reps (weight optional), 'time' = seconds, 'sled' = load and lengths.
// step = the smallest weight change. start = a cautious first weight to adjust on day one.
const EX = {
  // ----- Upper body -----
  latpull:   { name: 'Lat pulldown', kind: 'load', step: 2.5, start: 20, video: YT('0lNuPeUdKpk'), cue: 'Pull the bar to your upper chest. Elbows down, shoulders away from your ears.' },
  asstpull:  { name: 'Assisted pull-up', kind: 'load', step: 2.5, start: 40, video: YT('gnElpp3Fm50'), cue: 'The weight here is the help the machine gives. Less help is harder.' },
  mpress:    { name: 'Machine shoulder press', kind: 'load', step: 2.5, start: 10, video: YT('yUPzAHvgx40'), cue: 'Press straight up without arching your back. Lower slowly.' },
  dbpress:   { name: 'Seated dumbbell press', kind: 'load', step: 1, start: 4, video: YT('WKEl69bIGus'), cue: 'Weight is per dumbbell. Bench upright, press up and slightly in.' },
  cablerow:  { name: 'Seated cable row', kind: 'load', step: 2.5, start: 20, video: YT('oFtfkSElE0s'), cue: 'Sit tall. Pull to your stomach and squeeze your shoulder blades together.' },
  csrow:     { name: 'Chest-supported dumbbell row', kind: 'load', step: 1, start: 6, video: YT('h2Xafysr43E'), cue: 'Weight is per dumbbell. Chest on an incline bench, pull elbows back.' },
  sarow:     { name: 'Single-arm dumbbell row', kind: 'load', step: 1, start: 8, video: YT('vbechsUCn24'), cue: 'One hand and knee on the bench. Pull the dumbbell to your hip.' },
  facepull:  { name: 'Cable face pull', kind: 'load', step: 2.5, start: 7.5, video: YT('eTCBSFlCJ_s'), cue: 'Rope at face height. Pull toward your eyes with elbows high.' },
  pullapart: { name: 'Band pull-apart', kind: 'body', video: YT('LoBBo1dtY6I'), cue: 'Arms straight in front. Pull the band apart to your chest.' },
  revfly:    { name: 'Dumbbell reverse fly', kind: 'load', step: 1, start: 2, video: YT('JoCRRZ3zRtI'), cue: 'Hinge forward, soft elbows, lift the dumbbells out to the sides.' },
  latraise:  { name: 'Dumbbell lateral raise', kind: 'load', step: 1, start: 2, video: YT('XPPfnSEATJA'), cue: 'Weight is per dumbbell. Lift to shoulder height, lower slowly.' },
  cablelat:  { name: 'Cable lateral raise', kind: 'load', step: 1.25, start: 2.5, video: YTS('cable lateral raise how to'), cue: 'Low pulley, one arm at a time. Lift to shoulder height.' },
  extrot:    { name: 'Cable external rotation', kind: 'load', step: 1.25, start: 2.5, side: true, video: YT('PVdgjHqAes8'), cue: 'Elbow tucked to your side. Rotate your forearm outward, slowly.' },
  bandrot:   { name: 'Band external rotation', kind: 'body', side: true, video: YT('4HqMXMn3FBk'), cue: 'Elbow tucked to your side. Rotate your forearm outward against the band.' },
  pallof:    { name: 'Pallof press', kind: 'load', step: 2.5, start: 5, side: true, video: YT('LA6Uc5yIV1c'), cue: 'Side-on to the cable. Press your hands straight out and do not let your body turn.' },
  deadbug:   { name: 'Dead bug', kind: 'body', side: true, video: YT('bxn9FBrt4-A'), cue: 'Lower back flat on the floor. Lower the opposite arm and leg slowly.' },
  farmer:    { name: 'Farmer carry', kind: 'load', step: 2, start: 8, video: YT('VBobkldqqvk'), cue: 'Weight is per hand. Walk tall. Log each walk of about 20 metres as one rep.' },

  // ----- Legs -----
  sled:      { name: 'Backward sled drag', kind: 'sled', step: 5, start: 20, video: YT('UuXSpTYiJKA'), cue: 'Tall posture, small steps backward, push through the whole foot.' },
  legpress:  { name: 'Leg press', kind: 'load', step: 5, start: 20, video: YT('uRFWe2nOUjg'), cue: 'Three seconds down, short pause, drive up. Knees track over your toes.' },
  hack:      { name: 'Hack squat', kind: 'load', step: 5, start: 0, video: YTS('hack squat machine how to beginner'), cue: 'Three seconds down. Go only as deep as stays pain-free.' },
  goblet:    { name: 'Heels-raised goblet squat', kind: 'load', step: 2, start: 6, video: YT('lt9BKstdwdU'), cue: 'Heels on a plate, kettlebell at your chest. Three seconds down.' },
  legext:    { name: 'Leg extension', kind: 'load', step: 2.5, start: 10, video: YT('Cy9TJ_jhEBs'), cue: 'Slow and controlled. Two seconds up, one-second squeeze, three seconds down.' },
  spanish:   { name: 'Spanish squat hold', kind: 'time', video: YT('0WmHDIQ-fbM'), cue: 'Band behind your knees, anchored to a rack. Sit back and hold. Shins stay upright.' },
  wallsit:   { name: 'Wall sit', kind: 'time', video: YT('JaZNYM3zAP0'), cue: 'Back flat on the wall at your deepest pain-free angle. Breathe.' },
  legcurl:   { name: 'Seated leg curl', kind: 'load', step: 2.5, start: 15, video: YT('Z5pRnXaCjpM'), cue: 'Curl your heels under the seat. Lower slowly.' },
  backext:   { name: 'Back extension', kind: 'body', video: YT('uBVWJgW69GQ'), cue: 'Hinge at your hips with a long spine. Squeeze your glutes to come up.' },
  hipthrust: { name: 'Hip thrust', kind: 'load', step: 2.5, start: 10, video: YT('UmY5lVwpycE'), cue: 'Shoulder blades on the bench. Push through your heels and squeeze at the top.' },
  pullthru:  { name: 'Cable pull-through', kind: 'load', step: 2.5, start: 10, video: YT('oTGgQ1Nq8J0'), cue: 'Rope between your legs. Hinge back, then drive your hips forward.' },
  hipabd:    { name: 'Hip abduction machine', kind: 'load', step: 2.5, start: 15, video: YT('5O_Y9l__iao'), cue: 'Push your knees apart, pause, and return slowly.' },
  clamshell: { name: 'Banded clamshell', kind: 'body', side: true, video: YT('kc-K2l-nzcM'), cue: 'Band above your knees. Open the top knee, pause one second, lower.' },
  sideplank: { name: 'Side plank', kind: 'time', side: true, video: YT('44ND4bOB-T0'), cue: 'Elbow under your shoulder. One straight line from head to feet.' },
  splitsq:   { name: 'Supported split squat', kind: 'load', step: 1, start: 0, side: true, video: YT('fJ0gIh1svLE'), cue: 'Front foot raised on a plate, one hand on a rail. Three seconds down. Weight 0 means bodyweight.' },
  smithsplit:{ name: 'Smith machine split squat', kind: 'load', step: 2.5, start: 0, side: true, video: YTS('smith machine split squat how to'), cue: 'Weight added to the bar. Three seconds down, knee tracks over your toes.' },
  stepup:    { name: 'Step-up', kind: 'load', step: 1, start: 0, side: true, video: YT('OxWZ-G-RdCM'), cue: 'Step up, stand tall, step down with the same leg under control.' },
  patrick:   { name: 'Patrick step-down', kind: 'body', side: true, video: YT('GAjKqmtaGh4'), cue: 'Stand on a low plate. Lower the other heel to the floor over four seconds. Use a hand for balance.' },
  latstep:   { name: 'Lateral step-down', kind: 'body', side: true, video: YT('KVrReQL7R9o'), cue: 'Side-on to a low step. Lower the outside foot over three seconds. Do not let the knee drop inward.' },
  rdl:       { name: 'Dumbbell Romanian deadlift', kind: 'load', step: 1, start: 6, video: YT('uUjqvxEWcbo'), cue: 'Weight is per dumbbell. Soft knees, push your hips back, flat back.' },
  slbridge:  { name: 'Single-leg glute bridge', kind: 'body', side: true, video: YT('nat5dN0Kuao'), cue: 'Hips level. Squeeze the glute at the top.' },
  calf:      { name: 'Calf raise', kind: 'load', step: 2, start: 0, video: YT('KRJIKsY02nE'), cue: 'Up for one second, pause, down for two. Weight 0 means bodyweight.' },
  slcalf:    { name: 'Single-leg calf raise', kind: 'body', side: true, video: YT('KRJIKsY02nE'), cue: 'One leg at a time, hand on a wall for balance.' },

  // ----- Home cuff session -----
  cuffsquat: { name: 'Cuff goblet squat', kind: 'load', step: 1, start: 0, video: YT('lt9BKstdwdU'), cue: 'Cuff on. Bodyweight or up to 3 kg. Two seconds down, one second up.' },
  cufftke:   { name: 'Cuff banded knee extension', kind: 'body', side: true, video: YT('ZY09wd68TFI'), cue: 'Cuff on. Band behind the knee, straighten and squeeze. Two-second tempo.' },
};

// Alternatives for a busy gym, in the order to try them.
const ALTS = {
  latpull: ['asstpull'], mpress: ['dbpress'], cablerow: ['csrow', 'sarow'],
  facepull: ['pullapart', 'revfly'], latraise: ['cablelat'], extrot: ['bandrot'],
  pallof: ['deadbug', 'farmer'],
  legpress: ['hack', 'goblet'], legext: ['spanish', 'wallsit'], legcurl: ['backext'],
  hipthrust: ['pullthru'], hipabd: ['clamshell'], sideplank: ['pallof'],
  splitsq: ['smithsplit', 'stepup'], patrick: ['latstep'], rdl: ['backext', 'pullthru'],
  slbridge: ['hipthrust'], calf: ['slcalf'], spanish: ['wallsit'],
};

// Warm-up and cool-down items: tick-off only, nothing to log.
const PREP = {
  row:      { name: 'Easy rower or cross-trainer', dose: '3 min', video: '' },
  catcow:   { name: 'Cat-cow', dose: '8 slow reps', video: YT('CE_5RWjFA3Q') },
  openbook: { name: 'Open book', dose: '6 each side', video: YT('rDviWORCWEw') },
  pullwarm: { name: 'Band pull-apart', dose: '1 × 15', video: YT('LoBBo1dtY6I') },
  back4:    { name: 'Backward treadmill walk', dose: '4 min · incline 5 to 8%', video: YT('x19d9ArkhDc') },
  back2:    { name: 'Backward treadmill walk', dose: '2 min · incline 5 to 8%', video: YT('x19d9ArkhDc') },
  back9:    { name: 'Backward treadmill walk', dose: '9 min · incline 5 to 8%', video: YT('x19d9ArkhDc') },
  tke:      { name: 'Banded knee extension', dose: '1 × 15 each side · 1-second squeeze', video: YT('ZY09wd68TFI') },
  sidestep: { name: 'Banded side-step', dose: '2 × 12 each way', video: YT('khJyNWTFDho') },
  monster:  { name: 'Banded monster walk', dose: '2 × 12 forward and back', video: YT('khJyNWTFDho') },
  clamwarm: { name: 'Banded clamshell', dose: '2 × 15 each side', video: YT('kc-K2l-nzcM') },
  tib:      { name: 'Wall tibialis raise', dose: '1 × 20', video: YT('BKHTwGv71t4') },
  balance:  { name: 'Single-leg balance', dose: '30 s each side · soft knee', video: '' },
  couch:    { name: 'Couch stretch', dose: '45 s each side', video: YT('VZaWm5WjcX4') },
  hip9090:  { name: '90/90 hip stretch', dose: '1 min each side', video: YT('Oyy1CPtodWg') },
  calfstr:  { name: 'Calf stretch', dose: '30 s each side', video: YTS('standing calf stretch wall how to') },
  latstr:   { name: "Child's pose lat stretch", dose: '45 s each side', video: YT('BBZOrpOymEc') },
  pecstr:   { name: 'Doorway chest stretch', dose: '45 s each side', video: YT('bZ-eaBPOGiM') },
  cuffon:   { name: 'Measure pressure in the SAGA app and fit the cuff', dose: 'High on the thigh, on skin', video: '' },
};

// A main move: [exercise, sets, low reps, high reps, rest seconds, options]
// heavy: true = drops to 6 to 10 reps in weeks 10 to 12.
const m = (ex, sets, lo, hi, rest, o) => Object.assign({ ex, sets, lo, hi, rest }, o || {});

const SESSIONS = {
  upper: {
    title: 'Upper body', sub: 'shoulders and back', color: 'upper', bands: true,
    warm: () => ['row', 'catcow', 'openbook', 'pullwarm'],
    main: () => [
      m('latpull', 3, 8, 12, 120, { heavy: true }),
      m('mpress', 3, 8, 12, 120, { heavy: true }),
      m('cablerow', 3, 8, 12, 120, { heavy: true }),
      m('facepull', 2, 12, 15, 60),
      m('latraise', 2, 12, 15, 60),
      m('extrot', 2, 12, 15, 45),
      m('pallof', 2, 10, 10, 45),
    ],
    cool: () => ['latstr', 'pecstr'],
  },
  leg1: {
    title: 'Leg day 1', sub: 'quad strength', color: 'legs', bands: true, leg: true, sledSwitch: true,
    warm: (sled) => [sled ? 'back2' : 'back4', 'tke', 'sidestep', 'clamwarm', 'tib'],
    main: (sled) => [
      ...(sled ? [m('sled', 4, 1, 1, 60)] : []),
      m('legpress', 3, 8, 12, 120, { heavy: true }),
      m('legext', sled ? 2 : 3, 10, 15, 75, { halfRange: true }),
      m('legcurl', 3, 10, 12, 75),
      m('hipthrust', 3, 8, 12, 120, { heavy: true }),
      m('hipabd', 2, 12, 15, 60),
      m('sideplank', 2, 30, 30, 30),
    ],
    cool: () => ['couch', 'hip9090', 'calfstr'],
  },
  leg2: {
    title: 'Leg day 2', sub: 'single-leg control', color: 'legs', bands: true, leg: true, sledSwitch: true,
    warm: (sled) => [sled ? 'back4' : 'back9', 'tke', 'monster', 'clamwarm', 'tib', 'balance'],
    main: (sled) => [
      sled ? m('sled', 4, 1, 1, 60) : m('spanish', 3, 30, 40, 45),
      m('splitsq', 3, 6, 8, 75),
      m('patrick', 3, 8, 8, 60),
      m('rdl', 3, 8, 12, 90, { heavy: true }),
      m('slbridge', 2, 10, 10, 45),
      m('calf', 2, 12, 15, 45),
    ],
    cool: () => ['couch', 'hip9090', 'calfstr'],
  },
  cuff: {
    title: 'Home cuff session', sub: 'light quad work with the cuff', color: 'cuff', leg: true, home: true,
    warm: () => ['cuffon'],
    main: () => [
      m('cuffsquat', 4, 15, 15, 40, { fixed: [30, 15, 15, 15] }),
      m('cufftke', 4, 15, 15, 40, { fixed: [30, 15, 15, 15] }),
    ],
    cool: () => ['couch'],
  },
  swim: { title: 'Swim', sub: 'easy, 20 to 30 min', color: 'swim', simple: true },
};

const PLAN = {
  weeks: 12,
  defaultStart: '2026-11-23',
  cuffFromWeek: 7,
  phase(week) {
    if (week <= 3) return { name: 'Learn', note: 'Find your weights. Stop each set with 3 to 4 good reps left.', maxSets: 2, heavy: false };
    if (week <= 6) return { name: 'Build', note: 'Stop each set with 2 to 3 good reps left.', maxSets: 9, heavy: false };
    if (week <= 9) return { name: 'Build', note: 'Stop each set with 2 to 3 good reps left. The home cuff session is now available.', maxSets: 9, heavy: false };
    return { name: 'Heavier', note: 'Main lifts move to 6 to 10 reps with more weight. Stop with 2 good reps left.', maxSets: 9, heavy: true };
  },
  cuffPressure(week) { return week <= 8 ? 40 : week <= 10 ? 50 : 60; },
  swimNotes: ['Front crawl or backstroke with a gentle kick.', 'Skip the breaststroke kick: it twists the knee.', 'Push off the wall gently. A pull buoy is fine.'],
  cuffNotes: ['One leg at a time. Keep the cuff on through all four sets of a move, then release.', 'Rest 30 to 45 seconds between sets.', 'No more than these two moves, and no more than five minutes of cuff time per move.'],
  cuffStop: ['Numbness or tingling that lasts more than a minute after release', 'Any pain other than muscle burn', 'Skin mottling that does not clear quickly', 'Light-headedness or dizziness'],
  redFlags: ['Any feeling of the kneecap shifting or slipping, even briefly', 'A clunk with pain', 'A warm, puffy knee that has not settled in 24 hours', 'Sharp pain along the joint line', 'Pain above 5 out of 10 while loading', 'Pain at rest or at night'],
  rules: [
    'Stay in the rep range. When every set reaches the top of the range, the app adds the smallest weight step and you start again at the bottom.',
    'Single-leg moves: add reps first, then weight, then depth. Change one thing at a time.',
    'Knees track over your toes. If a knee drops inward, lower the weight.',
    'Leave at least 48 hours before training the same muscle group again.',
    'If your knee score the next morning is above your normal, the app holds or lowers the leg weights next time.',
  ],
};
