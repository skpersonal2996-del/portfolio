// Pixel art for "Outside of work": tiny Shruti, her poses, and the five things
// around her. Each sprite is a list of rows; each letter is one pixel, looked
// up in the palette ("." is empty). Overlays use "_" to erase a pixel.

export const PALETTE = {
  H: "#563425", // hair
  h: "#7A4B33", // hair highlight
  S: "#C98B62", // skin
  s: "#A86F4C", // skin shade, closed eyes
  E: "#1A1210", // eyes
  b: "#D9775C", // blush
  // Camera
  C: "#EDE8E0",
  M: "#6E6A66",
  L: "#1A1614",
  l: "#8A8580",
  G: "#A39D95",
  W: "#F5853F",
  // Book
  V: "#F4EFE6",
  w: "#A39D95",
  n: "#3A3531",
  // Suitcase
  U: "#A8603A",
  u: "#E7D3B8",
  Q: "#6E6A66",
  // Pencil, easel, drawing
  Y: "#F2C14E",
  y: "#C9962E",
  R: "#E88A9A",
  D: "#8A5A3A",
  F: "#EDE8E0",
  X: "#3A3531",
  // Photo, book cover
  o: "#F5853F",
  O: "#C45F24",
  v: "#8B7BE8",
  // Sparkles
  Z: "#FFE2C4",
};

// Outfits change the top (T, t), the backpack straps (P), hips (J), lower
// legs (L) and shoes (K). Stripes paint every other top row in t.
export const OUTFITS = [
  { name: "tee and jeans", T: "#EDE8E0", t: "#CFC9C0", P: "#F5853F", J: "#50627F", L: "#50627F", K: "#EDE8E0" },
  { name: "orange dress", T: "#F5853F", t: "#D9692C", P: "#7A3A1A", J: "#F5853F", L: "#C98B62", K: "#EDE8E0" },
  { name: "stripes and wide trousers", T: "#EDE8E0", t: "#34405E", P: "#F5853F", J: "#C9B79C", L: "#C9B79C", K: "#8A4B2A", stripes: true },
  { name: "violet jacket and denim skirt", T: "#8B7BE8", t: "#6B5BC8", P: "#F5853F", J: "#50627F", L: "#C98B62", K: "#EDE8E0" },
];

/* ---------- Tiny Shruti, 15 × 19 ---------- */

export const FRONT = [
  "....HHHHHHH....",
  "...HHHHHHHHH...",
  "..HHHHHHHHHhH..",
  "..HHSSSSHHHHH..",
  "..HHSSSSSSHHH..",
  "..HHSESSSESHH..",
  "..HHSSSSSSSHH..",
  "..HHbSSSSSbHH..",
  "..HHHSSSSSHHH..",
  "..HHHHSSSHHHH..",
  ".HHHTTTTTTTHHH.",
  ".HHTPTTTTTPTHH.",
  ".HSTPTTTTTPTSH.",
  "..STTTTTTTTTS..",
  "..S.JJJJJJJ.S..",
  "....JJJJJJJ....",
  "....LLL.LLL....",
  "....LLL.LLL....",
  "....KKK.KKK....",
];

// Eyes: a blink, and a glance to either side.
export const BLINK = { 5: "..HHSsSSSsSHH.." };
export const LOOK_L = { 5: "..HHESSSESSHH.." };
export const LOOK_R = { 5: "..HHSSESSSEHH.." };

// Back view, for the spin when she changes: hair all the way, backpack on.
export const BACK = [
  "....HHHHHHH....",
  "...HHHHHHHHH...",
  "..HHHHHHhHHHH..",
  "..HHHHHHHHHHH..",
  "..HHHHHHHHHHH..",
  "..HHHHHHHHHHH..",
  "..HHHHHHHHHHH..",
  "..HHHHHHHHHHH..",
  "..HHHHHHHHHHH..",
  "..HHHHHHHHHHH..",
  ".HHHHPPPPPHHHH.",
  ".HHTPPPPPPPTHH.",
  ".HSTPPPPPPPTSH.",
  "..STTPPPPPTTS..",
  "..S.JJJJJJJ.S..",
  "....JJJJJJJ....",
  "....LLL.LLL....",
  "....LLL.LLL....",
  "....KKK.KKK....",
];

// Side view, facing right: hair behind, backpack on her back.
export const SIDE = [
  ".....HHHHHH....",
  "....HHHHHHHH...",
  "...HHHHHHHHHh..",
  "...HHHHHHHSSH..",
  "..HHHHHHHSSSS..",
  "..HHHHHHHSSES..",
  "..HHHHHHHSSSSS.",
  "..HHHHHHHbSSS..",
  "..HHHHHHHHSS...",
  "..HHHHHHHSS....",
  "..HHHPPTTTTT...",
  "..HHPPPTTTTT...",
  "...HPPPTTSTT...",
  "....PPPTTSTT...",
  ".....PJJJSJ....",
  "......JJJJJ....",
  "......LL.LL....",
  "......LL.LL....",
  "......KK.KKK...",
];

// Walking, two steps. Rows from 14 down replace the side view's legs.
export const STEP_A = {
  14: ".....PJJJJJS...",
  15: "......JJJJJ....",
  16: ".....LL...LL...",
  17: "....LL.....LL..",
  18: "...KK......KKK.",
};
export const STEP_B = {
  14: ".....PJJJSJ....",
  15: "......JJJJJ....",
  16: "......LLLL.....",
  17: ".......LLL.....",
  18: ".......KKKK....",
};

// Holding the camera up to her face.
export const CAMERA = [
  "...............",
  "...............",
  "...............",
  "...............",
  "......GG.......",
  "...CCCCCCCCC...",
  ".SSCCMMMCCWCSS.",
  ".SSCMLlLMCCCSS.",
  "..SCCMMMCCCCS..",
  "..S.........S..",
  "..T.........T..",
  "...............",
  "..H.........H..",
  ".._.........._..",
  ".._.........._..",
];

// Halfway down to sitting.
export const SQUAT = [
  "...............",
  "...............",
  ...FRONT.slice(0, 15),
  "...LLLL.LLLL...",
  "...KKK...KKK...",
];

// Sitting cross-legged with a book open on her lap, looking down.
export const SIT = [
  "....HHHHHHH....",
  "...HHHHHHHHH...",
  "..HHHHHHHHHhH..",
  "..HHSSSSHHHHH..",
  "..HHSSSSSSHHH..",
  "..HHSSSSSSSHH..",
  "..HHSESSSESHH..",
  "..HHbSSSSSbHH..",
  "..HHHSSSSSHHH..",
  "..HHHHSSSHHHH..",
  ".HHHTTTTTTTHHH.",
  ".HHTPTTTTTPTHH.",
  ".HSTPTTTTTPTSH.",
  "..SVVVVnVVVVS..",
  ".LLVwwVnVwwVLL.",
  "KLLLLLLLLLLLLLK",
];
// A page turning over the spine, then the next page's lines.
export const PAGE_1 = { 12: "........VV....." };
export const PAGE_2 = { 12: ".....VV........" };
export const PAGE_NEXT = { 14: ".LLVwVVnVwVwVLL." };

// Drawing: side view, arm out at shoulder height, pencil on the paper. The
// two frames move the pencil up and down while she scribbles.
export const DRAW = {
  10: "..HHHPPTTTTSSYX",
  12: "...HPPPTTTTT...",
  13: "....PPPTTTTT...",
  14: ".....PJJJJJ....",
};
export const DRAW_UP = {
  9: "..HHHHHHHSS..YX",
  10: "..HHHPPTTTTSS..",
  12: "...HPPPTTTTT...",
  13: "....PPPTTTTT...",
  14: ".....PJJJJJ....",
};

// An easel with a sheet of paper, 14 × 16. The drawing goes on the sheet.
export const EASEL = [
  "......DD......",
  ".FFFFFFFFFFFF.",
  ".FFFFFFFFFFFF.",
  ".FFFFFFFFFFFF.",
  ".FFFFFFFFFFFF.",
  ".FFFFFFFFFFFF.",
  ".FFFFFFFFFFFF.",
  ".FFFFFFFFFFFF.",
  ".FFFFFFFFFFFF.",
  ".FFFFFFFFFFFF.",
  ".FFFFFFFFFFFF.",
  "DDDDDDDDDDDDDD",
  "..D.......D...",
  ".D.........D..",
  ".D.........D..",
  "D...........D.",
];
// The drawing: a cat, lopsided, with one big wonky eye. [x, y] on the easel,
// in the order the pencil makes it: outline, ears, eyes, mouth, a whisker.
export const DOODLE = [
  [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 7],
  [3, 8], [4, 9], [5, 9], [6, 9], [7, 9], [8, 9], [10, 8],
  [11, 7], [11, 6], [11, 5], [11, 4], [11, 3],
  [10, 2], [10, 1], [9, 2],
  [8, 3], [7, 3], [6, 3], [5, 3], [4, 3], [3, 2],
  [4, 5], [5, 5], [5, 6], [9, 5],
  [7, 7], [8, 7],
  [3, 7],
];

// A little carry-on, 7 × 6, pulled behind her; its handle reaches her hand.
export const SUITCASE = [
  "......Q",
  ".....Q.",
  "UUUUQ..",
  "UuuuU..",
  "UUUUU..",
  ".Q..Q..",
];
// Standing beside her once she's arrived.
export const SUITCASE_UP = [
  ".QQQ.",
  ".Q.Q.",
  "UUUUU",
  "UuuuU",
  "UUUUU",
  "UuuuU",
  "UUUUU",
  ".Q.Q.",
];
// Pulling it: her hand is back at her hip.
export const PULL = {
  12: "...HPPPTTTTT...",
  13: "....PPPTTTTT...",
  14: "....SPJJJJJ....",
};

// A photo that drops out of the camera, 5 × 6.
export const PHOTO = [
  "FFFFF",
  "FoovF",
  "FovvF",
  "FvvvF",
  "FFFFF",
  "FFFFF",
];

/* ---------- Places she walks past, faint in the background ---------- */

export const LAND_COLORS = { 1: "#221E1A", 2: "#2E2823" };
export const MOUNTAINS = [
  "........1............",
  ".......111...........",
  "......11211......1...",
  ".....1122211....111..",
  "....111222111..11111.",
  "...11111111111111111.",
  "..1111111111111111111",
  ".11111111111111111111",
];
export const PALM = [
  "..11.11..",
  ".1111111.",
  "111.1.111",
  "1...1...1",
  "....1....",
  "....1....",
  "...1.....",
  "...1.....",
  "...1.....",
  "...1.....",
  "...1.....",
  "...1.....",
  "..111....",
];
export const TOWER = [
  "....1....",
  "....1....",
  "...111...",
  "...1.1...",
  "...111...",
  "...1.1...",
  "..11111..",
  "..1...1..",
  "..1...1..",
  ".1111111.",
  ".1.....1.",
  ".1..1..1.",
  "1..1.1..1",
  "1.1...1.1",
  "11.....11",
  "1.......1",
];
export const CACTUS = [
  "...1...",
  "..111..",
  "1.111..",
  "1.111.1",
  "11111.1",
  "..11111",
  "..111..",
  "..111..",
  "..111..",
];
export const LIGHTHOUSE = [
  "..111..",
  ".12221.",
  ".11111.",
  "..111..",
  "..121..",
  "..111..",
  "..121..",
  ".11111.",
  ".12221.",
  ".11111.",
  ".12221.",
  "1111111",
];

/* ---------- The things around her, 12 wide ---------- */

export const ICONS = {
  camera: [
    "..GGG....WW.",
    ".CCCCCCCCCC.",
    "CCCCMMMMCCCC",
    "CDDMLLLLMDDC",
    "CDDMLlLLMDDC",
    "CDDMLLLLMDDC",
    "CCCCMMMMCCCC",
    ".CCCCCCCCCC.",
  ],
  book: [
    "..oooooooo..",
    ".Ooooooooooo",
    ".OooVVVVVooV",
    ".OoooooooooV",
    ".OoooVVVoooV",
    ".OoooooooooV",
    ".OoooooooooV",
    ".OoooooooooV",
    ".OoooooooooV",
    "..VVVVVVVVVV",
    "......v.....",
    "......v.....",
  ],
  clothes: [
    ".....GG.....",
    "......G.....",
    ".....G......",
    "...GGGGGG...",
    "..GvvvvvvG..",
    "...vvvvvv...",
    "....vvvv....",
    "...vvvvvv...",
    "..vvvvvvvv..",
    ".vvvvvvvvvv.",
    "vvvvvvvvvvvv",
    "vFvFvFvFvFvF",
  ],
  pencil: [
    "..........RR",
    ".........RRR",
    "........GGR.",
    ".......YyG..",
    "......YYy...",
    ".....YYy....",
    "....YYy.....",
    "...YYy......",
    "..uuy.......",
    ".uuu........",
    ".Xu.........",
    "X...........",
  ],
  suitcase: [
    "....GGGG....",
    "....G..G....",
    ".UUUUUUUUUU.",
    ".UuUUUUUUuU.",
    ".UuUUUUUUuU.",
    ".UuUUvvUUuU.",
    ".UuUUvvUUuU.",
    ".UuUUUUUUuU.",
    ".UUUUUUUUUU.",
    "..Q......Q..",
  ],
};

/* ---------- Helpers ---------- */

// A sprite with some rows swapped out: { rowIndex: "new row" }.
export const withRows = (rows, swap) => rows.map((r, i) => swap[i] ?? r);

// A sprite with another laid over it: "." keeps, "_" erases, anything else paints.
export const over = (rows, top) =>
  rows.map((r, i) => {
    const t = top[i];
    if (!t) return r;
    return [...r].map((c, j) => (t[j] === "_" ? "." : t[j] && t[j] !== "." ? t[j] : c)).join("");
  });

export const mirror = (rows) => rows.map((r) => [...r].reverse().join(""));

// Paint a sprite on a 2D context. x and y are in pixels of the art, s is the
// size of one art pixel in device pixels, and ox, oy offset the whole grid.
// keep(i, j), if given, decides pixel by pixel whether to paint (for fades).
export function paint(ctx, rows, x, y, s, colors, { ox = 0, oy = 0, stripes = false, keep = null } = {}) {
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) {
      let c = row[i];
      if (c === "." || c === " ") continue;
      if (keep && !keep(i, j)) continue;
      if (stripes && c === "T" && j % 2 === 1) c = "t";
      const fill = colors[c];
      if (!fill) continue;
      ctx.fillStyle = fill;
      ctx.fillRect(ox + (x + i) * s, oy + (y + j) * s, s, s);
    }
  }
}
