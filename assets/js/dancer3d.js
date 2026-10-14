// OFRIDANCE — a 3D mannequin that dances moves written as keyframed poses in counts.
// Used by dancer.html (move explorer) and counts.html (eight-count builder).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const D2R = Math.PI / 180;
const JOINTS = ['hips', 'spine', 'chest', 'neck', 'head', 'armL', 'foreL', 'armR', 'foreR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];

// ---------- pose helpers ----------
// A pose: { joint: [x, y, z] degrees, lift: metres, x: metres, z: metres, turn: degrees, autoFeet: true }
const REST = { armL: [0, 0, 7], armR: [0, 0, -7], foreL: [-12, 0, 0], foreR: [-12, 0, 0] };
function P(o = {}) { return Object.assign({}, REST, o); }
function mirrorPose(p) {
  const out = {};
  for (const k in p) {
    const v = p[k];
    const k2 = k.endsWith('L') ? k.slice(0, -1) + 'R' : k.endsWith('R') ? k.slice(0, -1) + 'L' : k;
    if (Array.isArray(v)) out[k2] = [v[0], -v[1], -v[2]];
    else if (k === 'x') out.x = -v; else if (k === 'turn') out.turn = -v; else out[k2] = v;
  }
  return out;
}
// common shapes
const knees = (d) => ({ thighL: [-d * 0.55, 0, 3], shinL: [d, 0, 0], thighR: [-d * 0.55, 0, -3], shinR: [d, 0, 0] });
const grooveArms = { armL: [-18, 0, 14], foreL: [-62, 0, 0], armR: [-18, 0, -14], foreR: [-62, 0, 0] };

// ---------- the move library ----------
// len: counts. keys: [time in counts, pose, ease]. ease: 'hit' (snaps then holds), 'smooth', 'linear'.
export const MOVES = [
  // HIP-HOP
  { id: 'bounce', style: 'hiphop', name: 'באונס', en: 'Bounce', len: 2,
    how: 'ברכיים רכות יורדות על כל ספירה ועולות על ה"וגם". הכתפיים רפויות, החזה זז עם הירידה. זה הלב של הגרוב.',
    tip: 'הטעות הנפוצה: לקפוץ למעלה. הבאונס הולך למטה, לתוך הרצפה.',
    keys: [[0, P({ ...knees(46), ...grooveArms, chest: [12, 0, 0], head: [8, 0, 0] }), 'hit'], [0.5, P({ ...knees(12), ...grooveArms, chest: [2, 0, 0] }), 'smooth'], [1, P({ ...knees(46), ...grooveArms, chest: [12, 0, 0], head: [8, 0, 0] }), 'hit'], [1.5, P({ ...knees(12), ...grooveArms, chest: [2, 0, 0] }), 'smooth'], [2, P({ ...knees(46), ...grooveArms, chest: [12, 0, 0], head: [8, 0, 0] }), 'hit']] },
  { id: 'rock', style: 'hiphop', name: 'רוק', en: 'Rock', len: 2,
    how: 'החזה נשען קדימה על הספירה ונמשך אחורה על ה"וגם", כמו נדנדה. הברכיים מלוות את התנועה.',
    tip: 'התנועה יוצאת מהחזה ומהגב העליון, לא מהראש.',
    keys: [[0, P({ ...knees(30), ...grooveArms, chest: [26, 0, 0], spine: [8, 0, 0] }), 'hit'], [0.5, P({ ...knees(18), ...grooveArms, chest: [-14, 0, 0], spine: [-4, 0, 0], head: [-6, 0, 0] }), 'smooth'], [1, P({ ...knees(30), ...grooveArms, chest: [26, 0, 0], spine: [8, 0, 0] }), 'hit'], [1.5, P({ ...knees(18), ...grooveArms, chest: [-14, 0, 0], spine: [-4, 0, 0], head: [-6, 0, 0] }), 'smooth'], [2, P({ ...knees(30), ...grooveArms, chest: [26, 0, 0], spine: [8, 0, 0] }), 'hit']] },
  { id: 'step', style: 'hiphop', name: 'צעד צד', en: 'Two-step', len: 4,
    how: 'צעד לימין על אחת, הרגל השנייה נוגעת ליד על שתיים. צעד לשמאל על שלוש, נגיעה על ארבע. כל צעד יורד לתוך באונס.',
    tip: 'הידיים מתנדנדות נגד הרגליים, וזה מה שהופך צעד פשוט לגרוב.',
    keys: [[0, P({ ...knees(20), ...grooveArms }), 'smooth'], [1, P({ x: -0.28, thighR: [-10, 0, -4], shinR: [30, 0, 0], thighL: [-16, 0, -6], shinL: [36, 0, 0], armL: [-30, 0, 20], foreL: [-70, 0, 0], armR: [10, 0, -10], foreR: [-40, 0, 0], chest: [10, -10, 0] }), 'hit'], [2, P({ x: -0.28, ...knees(28), ...grooveArms, chest: [12, 0, 0] }), 'smooth'], [3, P({ x: 0, thighL: [-10, 0, 4], shinL: [30, 0, 0], thighR: [-16, 0, 6], shinR: [36, 0, 0], armR: [-30, 0, -20], foreR: [-70, 0, 0], armL: [10, 0, 10], foreL: [-40, 0, 0], chest: [10, 10, 0] }), 'hit'], [4, P({ ...knees(20), ...grooveArms }), 'smooth']] },
  { id: 'runningman', style: 'hiphop', name: 'ראנינג מן', en: 'Running Man', len: 2,
    how: 'ברך אחת עולה קדימה בזמן שהרגל השנייה מחליקה אחורה, ומחליפים. נראה כמו ריצה במקום.',
    tip: 'מתחילים לאט, בלי החלקה: רק להרים ברך ולהחזיר. מאיצים כשהגוף זוכר.',
    keys: [[0, P({ thighL: [-72, 0, 2], shinL: [80, 0, 0], thighR: [10, 0, -2], shinR: [14, 0, 0], armL: [30, 0, 10], foreL: [-60, 0, 0], armR: [-40, 0, -10], foreR: [-70, 0, 0], chest: [8, 0, 0] }), 'hit'], [0.5, P({ ...knees(24), ...grooveArms }), 'smooth'], [1, P({ thighR: [-72, 0, -2], shinR: [80, 0, 0], thighL: [10, 0, 2], shinL: [14, 0, 0], armR: [30, 0, -10], foreR: [-60, 0, 0], armL: [-40, 0, 10], foreL: [-70, 0, 0], chest: [8, 0, 0] }), 'hit'], [1.5, P({ ...knees(24), ...grooveArms }), 'smooth'], [2, P({ thighL: [-72, 0, 2], shinL: [80, 0, 0], thighR: [10, 0, -2], shinR: [14, 0, 0], armL: [30, 0, 10], foreL: [-60, 0, 0], armR: [-40, 0, -10], foreR: [-70, 0, 0], chest: [8, 0, 0] }), 'hit']] },
  { id: 'bodyroll', style: 'hiphop', name: 'בודי רול', en: 'Body Roll', len: 4,
    how: 'גל שעובר בגוף מלמעלה למטה: ראש קדימה, חזה קדימה, בטן, אגן, ולבסוף הברכיים. ואז שוב מההתחלה.',
    tip: 'חושבים על גל ולא על חלקים. כל חלק מתחיל רגע לפני שהקודם נגמר.',
    keys: [[0, P({ ...knees(14), armL: [-10, 0, 14], foreL: [-30, 0, 0], armR: [-10, 0, -14], foreR: [-30, 0, 0] }), 'smooth'], [1, P({ ...knees(14), head: [26, 0, 0], neck: [14, 0, 0], chest: [-18, 0, 0], armL: [-10, 0, 14], foreL: [-30, 0, 0], armR: [-10, 0, -14], foreR: [-30, 0, 0] }), 'smooth'], [2, P({ ...knees(20), head: [-6, 0, 0], chest: [24, 0, 0], spine: [-16, 0, 0], armL: [-10, 0, 14], foreL: [-30, 0, 0], armR: [-10, 0, -14], foreR: [-30, 0, 0] }), 'smooth'], [3, P({ ...knees(44), hips: [-14, 0, 0], chest: [18, 0, 0], spine: [10, 0, 0], armL: [-10, 0, 14], foreL: [-30, 0, 0], armR: [-10, 0, -14], foreR: [-30, 0, 0] }), 'smooth'], [4, P({ ...knees(14), armL: [-10, 0, 14], foreL: [-30, 0, 0], armR: [-10, 0, -14], foreR: [-30, 0, 0] }), 'smooth']] },
  { id: 'hit', style: 'hiphop', name: 'היט', en: 'Hit', len: 2,
    how: 'עצירה חדה על מבטא במוזיקה: כל הגוף נכנס לתנוחה בבת אחת ונשאר שם. כאן: יד ימין נזרקת למעלה ויד שמאל לחזה.',
    tip: 'היט טוב הוא מהיר פנימה ושקט אחר כך. בלי לרעוד בסוף.',
    keys: [[0, P({ ...knees(20), ...grooveArms }), 'smooth'], [0.9, P({ ...knees(20), ...grooveArms }), 'linear'], [1, P({ ...knees(36), armR: [-176, 0, -6], foreR: [0, 0, 0], armL: [-80, 0, 30], foreL: [-110, 0, 0], chest: [-6, -14, 0], head: [-10, -20, 0] }), 'hit'], [2, P({ ...knees(36), armR: [-176, 0, -6], foreR: [0, 0, 0], armL: [-80, 0, 30], foreL: [-110, 0, 0], chest: [-6, -14, 0], head: [-10, -20, 0] }), 'linear']] },
  { id: 'chestpop', style: 'hiphop', name: 'פופ חזה', en: 'Chest Pop', len: 1,
    how: 'החזה נדחף קדימה בבת אחת על הספירה וחוזר על ה"וגם". השאר כמעט לא זז. זה בידוד: חלק אחד בתנועה, השאר שקט.',
    tip: 'שואפים קצת אוויר לפני הפופ. החזה מתמלא ונדחף.',
    keys: [[0, P({ ...knees(16), chest: [-22, 0, 0], spine: [6, 0, 0], armL: [-6, 0, 18], foreL: [-20, 0, 0], armR: [-6, 0, -18], foreR: [-20, 0, 0] }), 'hit'], [0.5, P({ ...knees(16), chest: [6, 0, 0], armL: [-6, 0, 14], foreL: [-20, 0, 0], armR: [-6, 0, -14], foreR: [-20, 0, 0] }), 'smooth'], [1, P({ ...knees(16), chest: [-22, 0, 0], spine: [6, 0, 0], armL: [-6, 0, 18], foreL: [-20, 0, 0], armR: [-6, 0, -18], foreR: [-20, 0, 0] }), 'hit']] },
  { id: 'point', style: 'hiphop', name: 'פוינט', en: 'Point (Locking)', len: 2,
    how: 'מהלוקינג: יד אחת נזרקת קדימה ומצביעה על הקהל, היד השנייה על המותן. על השתיים מחליפים צד.',
    tip: 'בלוקינג מחייכים. הסגנון שמח ופונה החוצה.',
    keys: [[0, P({ ...knees(20), armR: [-90, 24, -10], foreR: [0, 0, 0], armL: [20, 0, 40], foreL: [-100, 0, 0], chest: [6, -12, 0] }), 'hit'], [0.5, P({ ...knees(26), armR: [-60, 0, -10], foreR: [-50, 0, 0], armL: [20, 0, 40], foreL: [-100, 0, 0] }), 'smooth'], [1, P({ ...knees(20), armL: [-90, -24, 10], foreL: [0, 0, 0], armR: [20, 0, -40], foreR: [-100, 0, 0], chest: [6, 12, 0] }), 'hit'], [1.5, P({ ...knees(26), armL: [-60, 0, 10], foreL: [-50, 0, 0], armR: [20, 0, -40], foreR: [-100, 0, 0] }), 'smooth'], [2, P({ ...knees(20), armR: [-90, 24, -10], foreR: [0, 0, 0], armL: [20, 0, 40], foreL: [-100, 0, 0], chest: [6, -12, 0] }), 'hit']] },
  { id: 'stomp', style: 'hiphop', name: 'סטומפ', en: 'Stomp (Krump)', len: 2,
    how: 'מהקראמפ: ברך עולה גבוה ונוחתת בכוח, והזרועות מתנדנדות למטה עם הנחיתה. אנרגיה כבדה, לתוך הרצפה.',
    tip: 'הכוח בא מהגוף, לא מהברך. נוחתים על כף רגל שלמה עם ברך רכה.',
    keys: [[0, P({ ...knees(30), armL: [-70, 0, 40], foreL: [-80, 0, 0], armR: [-70, 0, -40], foreR: [-80, 0, 0], chest: [-8, 0, 0] }), 'smooth'], [0.6, P({ thighR: [-88, 0, -4], shinR: [96, 0, 0], thighL: [-14, 0, 2], shinL: [22, 0, 0], armL: [-130, 0, 30], foreL: [-60, 0, 0], armR: [-130, 0, -30], foreR: [-60, 0, 0], chest: [-14, 0, 0] }), 'smooth'], [1, P({ ...knees(52), armL: [30, 0, 20], foreL: [-30, 0, 0], armR: [30, 0, -20], foreR: [-30, 0, 0], chest: [30, 0, 0], head: [16, 0, 0] }), 'hit'], [2, P({ ...knees(30), armL: [-70, 0, 40], foreL: [-80, 0, 0], armR: [-70, 0, -40], foreR: [-80, 0, 0], chest: [-8, 0, 0] }), 'smooth']] },
  { id: 'wave', style: 'hiphop', name: 'גל בזרועות', en: 'Arm Wave', len: 4,
    how: 'הזרועות פתוחות לצדדים, והגל עובר מכף יד שמאל, דרך המרפק והכתף, אל הכתף והמרפק והיד של ימין.',
    tip: 'מתרגלים קודם כל זרוע לבד מול מראה, מפרק אחרי מפרק.',
    keys: [[0, P({ ...knees(10), armL: [0, 0, 88], foreL: [0, 0, 0], armR: [0, 0, -88], foreR: [0, 0, 0] }), 'smooth'], [1, P({ ...knees(10), armL: [0, 0, 80], foreL: [0, 0, 40], armR: [0, 0, -88], foreR: [0, 0, 0] }), 'smooth'], [2, P({ ...knees(10), armL: [0, 0, 104], foreL: [0, 0, -20], armR: [0, 0, -88], foreR: [0, 0, 0], chest: [0, 0, -6] }), 'smooth'], [3, P({ ...knees(10), armL: [0, 0, 88], foreL: [0, 0, 0], armR: [0, 0, -104], foreR: [0, 0, 20], chest: [0, 0, 6] }), 'smooth'], [3.5, P({ ...knees(10), armL: [0, 0, 88], foreL: [0, 0, 0], armR: [0, 0, -80], foreR: [0, 0, -40] }), 'smooth'], [4, P({ ...knees(10), armL: [0, 0, 88], foreL: [0, 0, 0], armR: [0, 0, -88], foreR: [0, 0, 0] }), 'smooth']] },
  { id: 'freeze', style: 'hiphop', name: 'פוזה', en: 'Pose', len: 2,
    how: 'סיום של משפט: יד אחת על הכובע הדמיוני, ירך החוצה, מבט לקהל. נכנסים על אחת ומחזיקים.',
    tip: 'פוזה מחזיקים עד הסוף, גם כשנראה שהספירות לא נגמרות.',
    keys: [[0, P({ ...knees(20), ...grooveArms }), 'smooth'], [1, P({ thighL: [-30, -20, 14], shinL: [40, 0, 0], thighR: [-4, 0, -4], shinR: [6, 0, 0], hips: [0, 0, -8], armR: [-150, 0, -40], foreR: [-120, 0, 0], armL: [10, 0, 30], foreL: [-80, 0, 0], chest: [-4, 16, 6], head: [-6, 16, 0], x: 0.06 }), 'hit'], [2, P({ thighL: [-30, -20, 14], shinL: [40, 0, 0], thighR: [-4, 0, -4], shinR: [6, 0, 0], hips: [0, 0, -8], armR: [-150, 0, -40], foreR: [-120, 0, 0], armL: [10, 0, 30], foreL: [-80, 0, 0], chest: [-4, 16, 6], head: [-6, 16, 0], x: 0.06 }), 'linear']] },
  { id: 'jump', style: 'hiphop', name: 'קפיצה עם היט', en: 'Jump Hit', len: 2,
    how: 'הכנה בברכיים על אחת, קפיצה עם ברכיים למעלה על ה"וגם", ונחיתה רכה וחזקה על שתיים.',
    tip: 'נוחתים דרך כף הרגל, ברכיים מעל האצבעות. אף פעם לא על ברכיים נעולות.',
    keys: [[0, P({ ...knees(20), ...grooveArms }), 'smooth'], [0.5, P({ ...knees(60), armL: [40, 0, 20], foreL: [-20, 0, 0], armR: [40, 0, -20], foreR: [-20, 0, 0], chest: [24, 0, 0] }), 'smooth'], [1, P({ ...knees(70), lift: 0.32, armL: [-160, 0, 30], foreL: [0, 0, 0], armR: [-160, 0, -30], foreR: [0, 0, 0], chest: [-8, 0, 0] }), 'smooth'], [1.5, P({ ...knees(58), armL: [-80, 0, 50], foreL: [-90, 0, 0], armR: [-80, 0, -50], foreR: [-90, 0, 0], chest: [20, 0, 0] }), 'hit'], [2, P({ ...knees(30), ...grooveArms }), 'smooth']] },

  // MODERN
  { id: 'breath', style: 'modern', name: 'נשימה', en: 'Breath Rise', len: 4,
    how: 'שאיפה ארוכה: הזרועות עולות מהצדדים מעל הראש והגוף מתארך. נשיפה: הזרועות יורדות, הברכיים מתכופפות לפליה.',
    tip: 'התנועה נמשכת בדיוק כמו הנשימה. לא מקדימים ולא מאחרים.',
    keys: [[0, P({ ...knees(30), armL: [0, 0, 10], foreL: [-6, 0, 0], armR: [0, 0, -10], foreR: [-6, 0, 0], chest: [8, 0, 0], head: [10, 0, 0] }), 'smooth'], [2, P({ armL: [0, 0, 172], foreL: [0, 0, 0], armR: [0, 0, -172], foreR: [0, 0, 0], chest: [-12, 0, 0], head: [-14, 0, 0] }), 'smooth'], [4, P({ ...knees(30), armL: [0, 0, 10], foreL: [-6, 0, 0], armR: [0, 0, -10], foreR: [-6, 0, 0], chest: [8, 0, 0], head: [10, 0, 0] }), 'smooth']] },
  { id: 'contraction', style: 'modern', name: 'קונטרקשן ורליס', en: 'Contraction & Release', len: 4,
    how: 'מטכניקת מרתה גרהם: הבטן נשאבת פנימה והגב מתעגל כמו C, הזרועות עוטפות. ואז רליס: החזה נפתח למעלה והזרועות נפתחות לצדדים.',
    tip: 'הקונטרקשן מתחיל מהאגן ומהבטן, לא מהכתפיים.',
    keys: [[0, P({ ...knees(16) }), 'smooth'], [1.5, P({ ...knees(40), hips: [-10, 0, 0], spine: [22, 0, 0], chest: [30, 0, 0], head: [24, 0, 0], armL: [-60, 0, 16], foreL: [-50, 0, 0], armR: [-60, 0, -16], foreR: [-50, 0, 0] }), 'smooth'], [2, P({ ...knees(40), hips: [-10, 0, 0], spine: [22, 0, 0], chest: [30, 0, 0], head: [24, 0, 0], armL: [-60, 0, 16], foreL: [-50, 0, 0], armR: [-60, 0, -16], foreR: [-50, 0, 0] }), 'linear'], [3.4, P({ ...knees(14), spine: [-10, 0, 0], chest: [-24, 0, 0], head: [-24, 0, 0], armL: [-40, 0, 110], foreL: [0, 0, 0], armR: [-40, 0, -110], foreR: [0, 0, 0] }), 'smooth'], [4, P({ ...knees(16) }), 'smooth']] },
  { id: 'spiral', style: 'modern', name: 'ספירלה', en: 'Spiral', len: 4,
    how: 'הגב העליון מסתובב סביב עמוד השדרה בזמן שהאגן נשאר מול הקהל. הזרועות נמשכות בעקבות הסיבוב, כמו מגבת שנסחטת.',
    tip: 'מגדילים את הסיבוב מהחזה, לא מהצוואר. המבט מגיע אחרון.',
    keys: [[0, P({ ...knees(20), armL: [-20, 0, 40], foreL: [-30, 0, 0], armR: [-20, 0, -40], foreR: [-30, 0, 0] }), 'smooth'], [2, P({ ...knees(34), spine: [0, 28, 0], chest: [6, 46, -6], head: [0, 30, 0], armL: [-80, 0, 70], foreL: [-20, 0, 0], armR: [-110, -40, -20], foreR: [-40, 0, 0] }), 'smooth'], [3, P({ ...knees(34), spine: [0, -20, 0], chest: [6, -34, 6], head: [0, -24, 0], armR: [-80, 0, -70], foreR: [-20, 0, 0], armL: [-110, 40, 20], foreL: [-40, 0, 0] }), 'smooth'], [4, P({ ...knees(20), armL: [-20, 0, 40], foreL: [-30, 0, 0], armR: [-20, 0, -40], foreR: [-30, 0, 0] }), 'smooth']] },
  { id: 'swing', style: 'modern', name: 'סווינג', en: 'Swing', len: 4,
    how: 'הזרועות נופלות מלמעלה, עוברות למטה עם כיפוף עמוק בברכיים, וממשיכות בתנופה למעלה מאחור. משקל ותנופה במקום כוח.',
    tip: 'הנפילה חופשית והעלייה היא תוצאה של התנופה. לא מרימים בכוח.',
    keys: [[0, P({ armL: [-170, 0, 8], foreL: [0, 0, 0], armR: [-170, 0, -8], foreR: [0, 0, 0], chest: [-6, 0, 0] }), 'smooth'], [1, P({ ...knees(62), armL: [-10, 0, 6], foreL: [0, 0, 0], armR: [-10, 0, -6], foreR: [0, 0, 0], chest: [46, 0, 0], spine: [20, 0, 0], head: [20, 0, 0] }), 'smooth'], [2, P({ ...knees(30), armL: [50, 0, 6], foreL: [0, 0, 0], armR: [50, 0, -6], foreR: [0, 0, 0], chest: [30, 0, 0], spine: [10, 0, 0] }), 'smooth'], [3, P({ ...knees(56), armL: [-20, 0, 6], foreL: [0, 0, 0], armR: [-20, 0, -6], foreR: [0, 0, 0], chest: [40, 0, 0], spine: [16, 0, 0] }), 'smooth'], [4, P({ armL: [-170, 0, 8], foreL: [0, 0, 0], armR: [-170, 0, -8], foreR: [0, 0, 0], chest: [-6, 0, 0] }), 'smooth']] },
  { id: 'tilt', style: 'modern', name: 'הטיה צדית', en: 'Lateral Tilt', len: 4,
    how: 'מטכניקת הורטון: הזרועות למעלה, והגוף כולו נוטה לצד כמו מחוג, עם רגל אחת שנפתחת לצד. חוזרים למרכז ונוטים לצד השני.',
    tip: 'הגוף נשאר שטוח, כאילו הוא בין שני קירות. לא מתקפלים קדימה.',
    keys: [[0, P({ armL: [0, 0, 170], foreL: [0, 0, 0], armR: [0, 0, -170], foreR: [0, 0, 0] }), 'smooth'], [1.5, P({ hips: [0, 0, -18], spine: [0, 0, -14], chest: [0, 0, -14], armL: [0, 0, 170], foreL: [0, 0, 0], armR: [0, 0, -170], foreR: [0, 0, 0], thighL: [0, 0, 44], shinL: [0, 0, 0], footL: [40, 0, 0], thighR: [0, 0, 16], x: -0.08 }), 'smooth'], [2, P({ armL: [0, 0, 170], foreL: [0, 0, 0], armR: [0, 0, -170], foreR: [0, 0, 0] }), 'smooth'], [3.5, P({ hips: [0, 0, 18], spine: [0, 0, 14], chest: [0, 0, 14], armL: [0, 0, 170], foreL: [0, 0, 0], armR: [0, 0, -170], foreR: [0, 0, 0], thighR: [0, 0, -44], shinR: [0, 0, 0], footR: [40, 0, 0], thighL: [0, 0, -16], x: 0.08 }), 'smooth'], [4, P({ armL: [0, 0, 170], foreL: [0, 0, 0], armR: [0, 0, -170], foreR: [0, 0, 0] }), 'smooth']] },
  { id: 'rolldown', style: 'modern', name: 'גלגול מטה', en: 'Roll Down', len: 8,
    how: 'הראש נופל ראשון, ואחריו חוליה אחרי חוליה עד שהגוף תלוי מטה מהמותניים. עולים באותה דרך: מהגב התחתון, והראש אחרון.',
    tip: 'הברכיים רכות לאורך כל הדרך. מי שלא מגיעה לרצפה, לא צריכה.',
    keys: [[0, P({ ...knees(8) }), 'smooth'], [1, P({ ...knees(8), head: [40, 0, 0], neck: [20, 0, 0] }), 'smooth'], [2, P({ ...knees(14), head: [44, 0, 0], neck: [24, 0, 0], chest: [40, 0, 0] }), 'smooth'], [4, P({ ...knees(22), head: [40, 0, 0], neck: [24, 0, 0], chest: [50, 0, 0], spine: [44, 0, 0], hips: [30, 0, 0], armL: [-40, 0, 2], foreL: [0, 0, 0], armR: [-40, 0, -2], foreR: [0, 0, 0] }), 'smooth'], [6, P({ ...knees(14), head: [44, 0, 0], neck: [24, 0, 0], chest: [40, 0, 0] }), 'smooth'], [7, P({ ...knees(8), head: [40, 0, 0], neck: [20, 0, 0] }), 'smooth'], [8, P({ ...knees(8) }), 'smooth']] },
  { id: 'arabesque', style: 'modern', name: 'ארבסק', en: 'Arabesque', len: 4,
    how: 'עמידה על רגל אחת, הרגל השנייה נמתחת ארוכה מאחור. החזה נשאר מורם והזרועות נמשכות קדימה ולמעלה, כמו קו אחד ארוך.',
    tip: 'מתחילים נמוך. גובה הרגל פחות חשוב מהקו הארוך מהאצבעות עד הבוהן.',
    keys: [[0, P({ ...knees(10) }), 'smooth'], [1.6, P({ thighR: [74, 0, -4], shinR: [0, 0, 0], footR: [30, 0, 0], thighL: [-4, 0, 0], shinL: [6, 0, 0], hips: [16, 0, 0], chest: [-14, 0, 0], head: [-10, 0, 0], armL: [-150, 0, 20], foreL: [0, 0, 0], armR: [-60, 0, -40], foreR: [0, 0, 0], autoFeetR: false }), 'smooth'], [2.6, P({ thighR: [74, 0, -4], shinR: [0, 0, 0], footR: [30, 0, 0], thighL: [-4, 0, 0], shinL: [6, 0, 0], hips: [16, 0, 0], chest: [-14, 0, 0], head: [-10, 0, 0], armL: [-150, 0, 20], foreL: [0, 0, 0], armR: [-60, 0, -40], foreR: [0, 0, 0], autoFeetR: false }), 'linear'], [4, P({ ...knees(10) }), 'smooth']] },
  { id: 'passe', style: 'modern', name: 'פאסה ואיזון', en: 'Passé Balance', len: 4,
    how: 'אצבעות רגל אחת עולות לאורך השוק עד הברך, והזרועות נפגשות מעל הראש. מחזיקים את האיזון ויורדים בשליטה.',
    tip: 'מבט לנקודה אחת קבועה, ובטן אסופה. האיזון בא מהמרכז.',
    keys: [[0, P({ ...knees(14) }), 'smooth'], [1.2, P({ thighL: [-80, 40, 40], shinL: [110, 0, 0], footL: [30, 0, 0], thighR: [0, 0, 0], shinR: [0, 0, 0], armL: [-170, 0, -14], foreL: [-20, 0, 0], armR: [-170, 0, 14], foreR: [-20, 0, 0], autoFeetL: false }), 'smooth'], [3, P({ thighL: [-80, 40, 40], shinL: [110, 0, 0], footL: [30, 0, 0], thighR: [0, 0, 0], shinR: [0, 0, 0], armL: [-170, 0, -14], foreL: [-20, 0, 0], armR: [-170, 0, 14], foreR: [-20, 0, 0], autoFeetL: false }), 'linear'], [4, P({ ...knees(14) }), 'smooth']] },
  { id: 'reach', style: 'modern', name: 'הושטה ומשיכה', en: 'Reach & Pull', len: 2,
    how: 'יד אחת נמתחת רחוק באלכסון למעלה, כאילו לוקחת משהו מהאוויר, ונמשכת חזרה אל החזה עם כיפוף.',
    tip: 'ההושטה ארוכה ומתמשכת, המשיכה חדה יותר. הניגוד הוא העניין.',
    keys: [[0, P({ ...knees(20), armL: [-20, 0, 20], foreL: [-60, 0, 0] }), 'smooth'], [1, P({ ...knees(8), armR: [-150, 0, -40], foreR: [0, 0, 0], chest: [-12, -14, -10], head: [-20, -14, 0], armL: [0, 0, 30], foreL: [0, 0, 0], x: 0.05 }), 'smooth'], [2, P({ ...knees(34), armR: [-60, 30, -10], foreR: [-130, 0, 0], chest: [24, 10, 0], head: [16, 0, 0], armL: [-20, 0, 20], foreL: [-60, 0, 0] }), 'hit']] },
  { id: 'turn', style: 'modern', name: 'סיבוב', en: 'Pivot Turn', len: 2,
    how: 'סיבוב מלא במקום על כף הרגל, הזרועות אסופות לחזה כדי להסתובב מהר. המבט נשאר על נקודה ונזרק סביב ברגע האחרון.',
    tip: 'זה נקרא "ספוטינג", והוא מה שמונע סחרחורת.',
    keys: [[0, P({ ...knees(20), armL: [-40, 0, 50], foreL: [-60, 0, 0], armR: [-40, 0, -50], foreR: [-60, 0, 0] }), 'smooth'], [0.3, P({ ...knees(6), armL: [-80, 0, 20], foreL: [-110, 0, 0], armR: [-80, 0, -20], foreR: [-110, 0, 0], turn: 30 }), 'smooth'], [1.6, P({ ...knees(6), armL: [-80, 0, 20], foreL: [-110, 0, 0], armR: [-80, 0, -20], foreR: [-110, 0, 0], turn: 340 }), 'smooth'], [2, P({ ...knees(20), armL: [-40, 0, 50], foreL: [-60, 0, 0], armR: [-40, 0, -50], foreR: [-60, 0, 0], turn: 360 }), 'smooth']] },
  { id: 'releve', style: 'modern', name: 'פליה ורלבה', en: 'Plié & Relevé', len: 2,
    how: 'הברכיים מתכופפות לצדדים מעל האצבעות (פליה), ואז הרגליים נמתחות והעקבים עולים מהרצפה (רלבה). שתי תנועות בסיס שכל קפיצה ונחיתה בנויות מהן.',
    tip: 'בפליה העקבים נשארים על הרצפה והגב ישר. בירידה מהרלבה העקב נוגע ברכות.',
    keys: [[0, P({ ...knees(10), armL: [-40, 0, 40], foreL: [-30, 0, 0], armR: [-40, 0, -40], foreR: [-30, 0, 0] }), 'smooth'], [0.8, P({ thighL: [-34, 30, 16], shinL: [62, 0, 0], thighR: [-34, -30, -16], shinR: [62, 0, 0], armL: [-20, 0, 70], foreL: [-10, 0, 0], armR: [-20, 0, -70], foreR: [-10, 0, 0] }), 'smooth'], [1.4, P({ footL: [38, 0, 0], footR: [38, 0, 0], autoFeetL: false, autoFeetR: false, armL: [-170, 0, -10], foreL: [-20, 0, 0], armR: [-170, 0, 10], foreR: [-20, 0, 0] }), 'smooth'], [2, P({ ...knees(10), armL: [-40, 0, 40], foreL: [-30, 0, 0], armR: [-40, 0, -40], foreR: [-30, 0, 0] }), 'smooth']] },
  { id: 'lunge', style: 'modern', name: 'נפילה והתאוששות', en: 'Fall & Recovery', len: 4,
    how: 'מדוריס האמפרי: הגוף נוטה עד שהוא מאבד שיווי משקל, נופל לצעד עמוק לצד, וחוזר למעלה בתנופה. בין הנפילה להתאוששות יש רגע תלוי באוויר.',
    tip: 'הרגע המעניין הוא שבריר השנייה שלפני הנפילה. מחכים לו.',
    keys: [[0, P({ ...knees(10) }), 'smooth'], [1, P({ hips: [0, 0, 10], chest: [0, 0, 14], head: [0, 0, 10], armL: [-90, 0, 90], foreL: [0, 0, 0], armR: [-20, 0, -30], foreR: [0, 0, 0], thighL: [0, 0, 4] }), 'smooth'], [2, P({ x: 0.36, thighL: [-50, 0, 30], shinL: [90, 0, 0], thighR: [0, 0, -30], shinR: [0, 0, 0], hips: [10, 0, 14], chest: [30, 0, 20], head: [20, 0, 10], armL: [-20, 0, 20], foreL: [-20, 0, 0], armR: [-160, 0, -30], foreR: [0, 0, 0] }), 'hit'], [3, P({ x: 0.2, ...knees(30), chest: [-10, 0, -6], armL: [-170, 0, 10], foreL: [0, 0, 0], armR: [-170, 0, -10], foreR: [0, 0, 0] }), 'smooth'], [4, P({ x: 0, ...knees(10) }), 'smooth']] },
];
export const MOVE_BY_ID = Object.fromEntries(MOVES.map((m) => [m.id, m]));

// ---------- easing ----------
const EASE = {
  hit: (t) => 1 - Math.pow(1 - Math.min(1, t * 1.6), 4),
  smooth: (t) => 0.5 - Math.cos(Math.PI * t) / 2,
  linear: (t) => t,
};
function lerpPose(a, b, k) {
  const out = {};
  for (const j of JOINTS) {
    const va = a[j] || [0, 0, 0], vb = b[j] || [0, 0, 0];
    out[j] = [va[0] + (vb[0] - va[0]) * k, va[1] + (vb[1] - va[1]) * k, va[2] + (vb[2] - va[2]) * k];
  }
  for (const s of ['lift', 'x', 'z', 'turn']) out[s] = (a[s] || 0) + ((b[s] || 0) - (a[s] || 0)) * k;
  out.autoFeetL = k < 0.5 ? a.autoFeetL : b.autoFeetL; out.autoFeetR = k < 0.5 ? a.autoFeetR : b.autoFeetR;
  return out;
}
export function sampleMove(move, t, mirrored) {
  const keys = move.keys; t = Math.max(0, Math.min(move.len, t));
  let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= t) i++;
  const [t0, p0] = keys[i]; const next = keys[Math.min(i + 1, keys.length - 1)];
  const [t1, p1, e] = next; const span = t1 - t0;
  const k = span > 0 ? EASE[e || 'smooth']((t - t0) / span) : 1;
  const p = lerpPose(p0, p1, k);
  return mirrored ? mirrorPose(p) : p;
}

// ---------- the figure ----------
function build(material, accent) {
  const g = new THREE.Group();
  const cap = (r, len, mat = material) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 16), mat); m.castShadow = true; return m; };
  const node = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };
  const J = {};
  J.root = node(g, 0, 0, 0);
  J.hips = node(J.root, 0, 0.94, 0);
  const pelvis = cap(0.11, 0.12); pelvis.rotation.z = Math.PI / 2; J.hips.add(pelvis);
  J.spine = node(J.hips, 0, 0.06, 0);
  const waist = cap(0.095, 0.14); waist.position.y = 0.1; J.spine.add(waist);
  J.chest = node(J.spine, 0, 0.2, 0);
  const torso = cap(0.13, 0.16); torso.position.y = 0.14; torso.scale.set(1.12, 1, 0.78); J.chest.add(torso);
  J.neck = node(J.chest, 0, 0.32, 0);
  const neck = cap(0.04, 0.06); neck.position.y = 0.04; J.neck.add(neck);
  J.head = node(J.neck, 0, 0.09, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 18), material); head.scale.set(0.9, 1.1, 0.95); head.position.y = 0.08; head.castShadow = true; J.head.add(head);
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), accent); bun.position.set(0, 0.17, -0.07); J.head.add(bun);
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    J['arm' + s] = node(J.chest, 0.19 * sx, 0.26, 0);
    const ua = cap(0.045, 0.22); ua.position.y = -0.14; J['arm' + s].add(ua);
    J['fore' + s] = node(J['arm' + s], 0, -0.29, 0);
    const fa = cap(0.038, 0.2); fa.position.y = -0.13; J['fore' + s].add(fa);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), material); hand.position.y = -0.28; hand.scale.set(0.8, 1.2, 0.6); J['fore' + s].add(hand);
    J['thigh' + s] = node(J.hips, 0.095 * sx, -0.04, 0);
    const th = cap(0.07, 0.3); th.position.y = -0.2; J['thigh' + s].add(th);
    J['shin' + s] = node(J['thigh' + s], 0, -0.42, 0);
    const sh = cap(0.055, 0.3); sh.position.y = -0.2; J['shin' + s].add(sh);
    J['foot' + s] = node(J['shin' + s], 0, -0.43, 0);
    const ft = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.06, 0.22), accent); ft.position.set(0, -0.03, 0.06); ft.castShadow = true; J['foot' + s].add(ft);
    J['toe' + s] = node(J['foot' + s], 0, -0.06, 0.17);
  }
  return { group: g, J };
}

export function createDancer(host, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(opts.background || '#141414');
  const cam = new THREE.PerspectiveCamera(34, 1, 0.05, 50);
  cam.position.set(0, 1.15, 3.9);
  const controls = new OrbitControls(cam, renderer.domElement);
  controls.target.set(0, 1.0, 0); controls.enableDamping = true; controls.minDistance = 1.8; controls.maxDistance = 9; controls.maxPolarAngle = Math.PI * 0.55; controls.enablePan = false;

  const floor = new THREE.Mesh(new THREE.CircleGeometry(2.2, 64), new THREE.MeshStandardMaterial({ color: '#202020', roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const front = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.004, 0.05), new THREE.MeshBasicMaterial({ color: '#d92b21' })); front.position.set(0, 0.002, 1.6); scene.add(front);
  scene.add(new THREE.HemisphereLight('#ffffff', '#303030', 0.9));
  const key = new THREE.DirectionalLight('#fff4ea', 2.4); key.position.set(-2.5, 5, 3.5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -2; key.shadow.camera.right = 2; key.shadow.camera.top = 3; key.shadow.camera.bottom = -1; scene.add(key);
  const rim = new THREE.DirectionalLight('#ff4a3d', 1.6); rim.position.set(3, 3, -3); scene.add(rim);

  const mat = new THREE.MeshStandardMaterial({ color: opts.body || '#ececec', roughness: 0.55, metalness: 0.0 });
  const acc = new THREE.MeshStandardMaterial({ color: '#d92b21', roughness: 0.5 });
  const { group, J } = build(mat, acc);
  scene.add(group);
  const tmp = new THREE.Vector3();

  function apply(p) {
    for (const j of JOINTS) {
      if (!J[j]) continue;
      let v = p[j] || [0, 0, 0];
      J[j].rotation.set(v[0] * D2R, v[1] * D2R, v[2] * D2R, 'XYZ');
    }
    // keep feet flat unless the pose points them
    for (const s of ['L', 'R']) {
      if (p['autoFeet' + s] === false) continue;
      const h = p.hips || [0, 0, 0], th = p['thigh' + s] || [0, 0, 0], sh = p['shin' + s] || [0, 0, 0], f = p['foot' + s] || [0, 0, 0];
      J['foot' + s].rotation.x = (-(h[0] + th[0] + sh[0]) + f[0] * 0) * D2R;
    }
    J.root.position.set(p.x || 0, 0, p.z || 0);
    J.root.rotation.y = (p.turn || 0) * D2R;
    J.hips.position.y = 0.94;
    group.updateMatrixWorld(true);
    // grounding: the lowest point of the feet touches the floor, then add lift for jumps
    let min = Infinity;
    for (const s of ['L', 'R']) { for (const n of [J['foot' + s], J['toe' + s]]) { n.getWorldPosition(tmp); min = Math.min(min, tmp.y); } }
    J.hips.position.y += (0.065 - min) + (p.lift || 0);
  }

  let seq = [], t = 0, playing = false, speed = 1, bpm = 100, mirrored = false, loop = true, onCount = null, onEnd = null, lastCount = -1;
  const totalLen = () => seq.reduce((a, s) => Math.max(a, s.start + s.len), 0);
  function poseAtTime(tt) {
    if (!seq.length) return P(knees(10));
    let cur = seq[0];
    for (const s of seq) if (tt >= s.start) cur = s;
    const local = tt - cur.start;
    if (local > cur.len) return sampleMove(MOVE_BY_ID[cur.id], cur.len, mirrored !== !!cur.mirror);
    return sampleMove(MOVE_BY_ID[cur.id], local, mirrored !== !!cur.mirror);
  }
  const clock = new THREE.Clock();
  const fit = () => {
    // keep the whole figure (about 2.3 m with raised arms) in frame whatever the viewport shape
    const v = THREE.MathUtils.degToRad(cam.fov) / 2;
    const dist = Math.max(1.3 / Math.tan(v), 0.95 / (Math.tan(v) * cam.aspect));
    const dir = cam.position.clone().sub(controls.target).normalize();
    cam.position.copy(controls.target).add(dir.multiplyScalar(dist));
    controls.maxDistance = Math.max(9, dist * 1.8);
  };
  const resize = () => { const w = host.clientWidth, h = host.clientHeight || 400; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); fit(); };
  const ro = new ResizeObserver(resize); ro.observe(host); resize();
  let alive = true;
  function frame() {
    if (!alive) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    if (playing && seq.length) {
      t += dt * (bpm / 60) * speed;
      const L = totalLen();
      if (t >= L) { if (loop) t -= L; else { t = L - 0.0001; playing = false; onEnd && onEnd(); } }
      const c = Math.floor(t);
      if (c !== lastCount) { lastCount = c; onCount && onCount(c, t); }
    }
    apply(poseAtTime(t));
    controls.update();
    renderer.render(scene, cam);
    requestAnimationFrame(frame);
  }
  frame();

  return {
    setSequence(s) { seq = s; t = Math.min(t, Math.max(totalLen() - 0.001, 0)); lastCount = -1; },
    play() { playing = true; lastCount = -1; clock.getDelta(); },
    pause() { playing = false; },
    get playing() { return playing; },
    seek(v) { t = v; lastCount = -1; },
    get time() { return t; },
    setSpeed(v) { speed = v; },
    setBpm(v) { bpm = v; },
    setMirror(v) { mirrored = v; },
    setLoop(v) { loop = v; },
    onCount(fn) { onCount = fn; },
    onEnd(fn) { onEnd = fn; },
    view(name) {
      const d = cam.position.distanceTo(controls.target);
      const dirs = { front: [0, 0.12, 1], side: [1, 0.12, 0], back: [0, 0.12, -1], top: [0.001, 1, 0.25], three: [0.7, 0.3, 0.75] };
      const v = new THREE.Vector3(...(dirs[name] || dirs.front)).normalize().multiplyScalar(d);
      cam.position.copy(controls.target).add(v);
    },
    dispose() { alive = false; ro.disconnect(); renderer.dispose(); renderer.domElement.remove(); },
  };
}

