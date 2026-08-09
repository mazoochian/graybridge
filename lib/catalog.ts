export const SIZES = ["XS", "S", "M", "L", "XL"];

export interface ProductVariant {
  size: string;
  color: string;
  stock: number;
}

/** Deterministically spreads a total stock count across every size x color cell so the sum matches exactly. */
export function distributeVariants(colors: string[], totalStock: number): ProductVariant[] {
  const cells = colors.length * SIZES.length;
  if (cells === 0) return [];
  const base = Math.floor(totalStock / cells);
  const remainder = totalStock % cells;
  const variants: ProductVariant[] = [];
  let cellIdx = 0;
  for (const color of colors) {
    for (const size of SIZES) {
      variants.push({ size, color, stock: base + (cellIdx < remainder ? 1 : 0) });
      cellIdx++;
    }
  }
  return variants;
}

export interface Product {
  id: number;
  name: string;
  cat: string;
  price: number;
  wasPrice: number | null;
  imgId: string;
  images: string[];
  colors: string[];
  tags: string[];
  rating: string;
  reviews: number;
  stock: number;
  sku: string;
  desc: string;
  variants: ProductVariant[];
  _ord: number;
  archived: boolean;
}

interface CatDef {
  ids: string[];
  pre: string[];
  suf: string[];
  min: number;
  max: number;
}

export const cats: Record<string, CatDef> = {
  "T-Shirts": {
    ids: [
      "1570358934903-35c0ff1bd95e",
      "1521572163474-6864f9cf17ab",
      "1576566588028-4147f3842f27",
      "1618354691373-d851c5c3a990",
      "1503341504253-dff4815485f1",
      "1581655353564-df123a1eb820",
      "1583743814966-8936f5b7be1a",
      "1626497764746-6dc36546b388",
      "1746899603348-ab9afd71e16d",
      "1642394079532-8ce715339e6e",
      "1733322987284-4210857c2ada",
      "1759572095329-1dcf9522762b",
      "1696086152504-4843b2106ab4",
      "1696086152586-09a0855dbc9c",
      "1778516632052-94b5cfbeb6c9",
      "1685883785814-42d0b197ae64",
      "1780565595344-d35838cff02d",
      "1685883518316-355533810d68",
      "1780565336781-8ebca3286eda",
      "1594592411201-1cdab35fdeb3",
      "1651761179569-4ba2aa054997",
      "1768935706759-f2be765b3aec",
      "1773525912586-fbc51bbe0fdf",
      "1758267928367-35886ad47bc4",
      "1622445275463-afa2ab738c34",
      "1775234576198-a1c680241c07",
      "1678099278102-45220282ba78",
    ],
    pre: ["Everyday", "Boxy", "Heavyweight", "Classic", "Relaxed", "Garment-Dyed", "Organic", "Slub", "Vintage", "Pima"],
    suf: ["Tee", "Pocket Tee", "T-Shirt", "Crew Tee"],
    min: 32,
    max: 58,
  },
  Knitwear: {
    ids: [
      "1556905055-8f358a7a47b2",
      "1614676471928-2ed0ad1061a4",
      "1485231183945-fffde7cc051e",
      "1601379327928-bedfaf9da2d0",
      "1608984361471-ff566593088f",
      "1643015862949-5c8d15a4242e",
      "1610973310510-82f514ea1986",
      "1602706294170-1fed8eecd9f9",
      "1600369672890-ac00f1907858",
      "1641642231157-0849081598a2",
      "1715176531842-7ffda4acdfa9",
      "1588271968087-4c51abe05afc",
      "1536992266094-82847e1fd431",
      "1603906650843-b58e94d9df4d",
      "1664293797551-2cf5c308d3c1",
      "1571139627661-cf707929f465",
      "1612797748239-a83ed306dcfc",
      "1633008004535-b255bab275cc",
      "1646270968349-dafd9f758e93",
      "1633972767447-5098f0322a45",
      "1670080589800-6416c8ce8a14",
      "1670087502693-ea2c85932098",
      "1670080946016-d9b4445ff8b6",
    ],
    pre: ["Merino", "Lambswool", "Cotton", "Chunky", "Fisherman", "Ribbed", "Cashmere-Blend", "Waffle"],
    suf: ["Crew Knit", "Sweater", "Cardigan", "Turtleneck", "Pullover"],
    min: 88,
    max: 178,
  },
  Outerwear: {
    ids: [
      "1591047139829-d91aecb6caea",
      "1611312449408-fcece27cdbb7",
      "1551537482-f2075a1d41f2",
      "1539533018447-63fcce2678e3",
      "1608635680046-aebf91c1a9c8",
      "1521223890158-f9f7c3d5d504",
      "1727524366429-27de8607d5f6",
      "1617032869698-583c00770254",
      "1611025035970-27e2a8e9e09f",
      "1727515192207-3dc860bfd773",
      "1611266614187-7de75d7fc03f",
      "1585215173785-7f3c2252c25a",
      "1727515546577-f7d82a47b51d",
      "1776010360845-1f6e384bcaac",
      "1669575903350-9a349b411810",
      "1692180142575-c31fcd106b5b",
      "1616150840617-a0124ea42a1f",
      "1776774646358-e7a8a9063375",
      "1567743739719-fb61082fe75a",
      "1782565196739-a4e16926f6b4",
      "1779733734896-d27a94c9ecd2",
    ],
    pre: ["Wool-Blend", "Quilted", "Waxed", "Hooded", "Field", "Insulated", "Lined"],
    suf: ["Overcoat", "Bomber", "Jacket", "Parka", "Chore Coat"],
    min: 148,
    max: 298,
  },
  Denim: {
    ids: [
      "1542272604-787c3835535d",
      "1541099649105-f69ad21f3246",
      "1604176354204-9268737828e4",
      "1576995853123-5a10305d93c0",
      "1525507119028-ed4c629a60a3",
      "1602293589930-45aad59ba3ab",
      "1714729382668-7bc3bb261662",
      "1637069585336-827b298fe84a",
      "1721637286605-ae9be19d681f",
      "1714143136372-ddaf8b606da7",
      "1565084888279-aca607ecce0c",
      "1529391409740-59f2cea08bc6",
      "1541840031508-326b77c9a17e",
      "1475178626620-a4d074967452",
      "1605518216938-7c31b7b14ad0",
      "1713880453396-aa0493e308ec",
      "1640336437301-8368b53861ab",
      "1714143136367-7bb68f3f0669",
      "1741941171881-40832346c7fe",
      "1714729382688-84602a1bd6ec",
      "1715758890151-2c15d5d482aa",
      "1721637222188-fa7bf56ceaf5",
      "1699706983784-94954a1e1a4e",
      "1634564235572-cd6f37694266",
      "1580644228275-2b826dbec5bf",
    ],
    pre: ["Selvedge", "Stretch", "Rigid", "Washed", "Tapered", "Straight", "Slim", "Relaxed"],
    suf: ["Jean", "Denim", "Five-Pocket"],
    min: 98,
    max: 188,
  },
  Sweats: {
    ids: [
      "1556821840-3a63f95609a7",
      "1620799140188-3b2a02fd9a77",
      "1564557287817-3785e38ec1f5",
      "1578768079052-aa76e52ff62e",
      "1615397587950-3cbb55f95b77",
      "1728394604722-c1007e3edf09",
      "1685328403755-de1d57e12e63",
      "1617044263761-23580da3f886",
      "1571821324176-52ff15e96348",
      "1699275303942-47957eea44b1",
      "1655141559697-f927ed68170c",
      "1586038693164-cb7ee3fb8e2c",
      "1771950014791-9a9771724369",
      "1632682582909-2b3a2581eef7",
      "1637206613746-64063c3ec68c",
      "1637206614670-e3f13e2c5984",
      "1622567893612-a5345baa5c9a",
      "1685328403732-64be6bb9d112",
      "1685328403783-00925c2a4301",
      "1785354986029-aad4890ec9b5",
      "1637206616858-7e80633a6162",
      "1692844394432-dcd7c729762e",
    ],
    pre: ["Heavyweight", "Loopback", "Brushed", "French Terry", "Garment-Dyed", "Vintage"],
    suf: ["Crewneck", "Hoodie", "Zip Hoodie", "Sweatpant"],
    min: 64,
    max: 128,
  },
  Shirts: {
    ids: [
      "1602810318383-e386cc2a3ccf",
      "1596755094514-f87e34085b2c",
      "1607345366928-199ea26cfe3e",
      "1740711152088-88a009e877bb",
      "1621072156002-e2fccdc0b176",
      "1624835567150-0c530a20d8cc",
      "1776838103951-993ff1ffc916",
      "1782226728289-f81457b760f5",
      "1760495805852-9deb9ddfe929",
      "1782227282777-31e421d02eaf",
      "1603252110481-7ba873bf42ab",
      "1779907391036-8bf5e720b9e0",
      "1602810320073-1230c46d89d4",
      "1602810318660-d2c46b750f88",
      "1762390849209-dc7099ae43e0",
      "1781106300695-52fa4d498566",
      "1779907391045-002a6cafefa2",
      "1784830597801-f64eb3799cdf",
      "1603252110971-b8a57087be18",
      "1603252109303-2751441dd157",
      "1603252109612-24fa03d145c8",
      "1603252109360-909baaf261c7",
      "1760552069745-86dfb3013f08",
    ],
    pre: ["Oxford", "Chambray", "Flannel", "Poplin", "Linen", "Brushed", "Western"],
    suf: ["Shirt", "Overshirt", "Button-Down"],
    min: 68,
    max: 138,
  },
};

export const catOptions = ["T-Shirts", "Knitwear", "Outerwear", "Denim", "Sweats", "Shirts"];

export function img(id: string, w = 700): string {
  if (/^https?:\/\//.test(id) || id.startsWith("/")) return id;
  return `https://images.unsplash.com/photo-${id}?fm=jpg&q=70&w=${w}&auto=format&fit=crop`;
}

/** Deterministic catalog (seeded PRNG) so server and client render identically. */
export function buildCatalog(): Product[] {
  const palette = [
    "Ecru",
    "Charcoal",
    "Stone",
    "Olive",
    "Navy",
    "Rust",
    "Sand",
    "Black",
    "Heather Grey",
    "Forest",
    "Clay",
    "Off-White",
  ];
  let seed = 20260616;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  let id = 1;
  const out: Product[] = [];
  Object.keys(cats).forEach((cat) => {
    const c = cats[cat];
    const pool = c.ids;
    // Assign each of the 25 products a distinct cover photo from the
    // category's pool where possible, instead of `k % pool.length`
    // wrapping and reusing the same id once k exceeds the pool size.
    const usedCoverIdx = new Set<number>();
    const coverIdx: number[] = [];
    for (let k = 0; k < 25; k++) {
      let idx = k % pool.length;
      if (usedCoverIdx.has(idx)) {
        let next = -1;
        for (let step = 1; step <= pool.length; step++) {
          const cand = (idx + step) % pool.length;
          if (!usedCoverIdx.has(cand)) {
            next = cand;
            break;
          }
        }
        // Pool fully exhausted (fewer unique photos than products in this
        // category) — fall back to the wrapped index; this is the one
        // remaining, unavoidable duplicate flagged by the backfill script.
        if (next !== -1) idx = next;
      }
      usedCoverIdx.add(idx);
      coverIdx.push(idx);
    }
    const galleryIds: string[][] = coverIdx.map((idx) => {
      const cover = pool[idx];
      const extra: string[] = [];
      for (const off of [9, 18]) {
        const cand = pool[(idx + off) % pool.length];
        if (cand !== cover && !extra.includes(cand)) extra.push(cand);
      }
      return [cover, ...extra];
    });
    for (let k = 0; k < 25; k++) {
      const pre = c.pre[k % c.pre.length];
      const suf = c.suf[(k * 3 + 1) % c.suf.length];
      const name = pre + " " + suf;
      const price = Math.round((c.min + rnd() * (c.max - c.min)) / 2) * 2;
      const images = galleryIds[k];
      const imgId = images[0];
      const ncol = 2 + Math.floor(rnd() * 3);
      const pp = palette.slice();
      const colors: string[] = [];
      for (let n = 0; n < ncol && pp.length; n++) colors.push(pp.splice(Math.floor(rnd() * pp.length), 1)[0]);
      const tags: string[] = [];
      if (rnd() < 0.26) tags.push("New");
      if (rnd() < 0.18) tags.push("Bestseller");
      if (rnd() < 0.1) tags.push("Limited");
      if (rnd() < 0.12) tags.push("Sale");
      if (rnd() < 0.42) tags.push("Organic Cotton");
      if (rnd() < 0.5) tags.push("Unisex");
      if ((cat === "Sweats" || cat === "Knitwear") && rnd() < 0.45) tags.push("Heavyweight");
      if (rnd() < 0.3) tags.push("Relaxed Fit");
      const onSale = tags.includes("Sale");
      const stock = Math.floor(rnd() * 64);
      const variants = distributeVariants(colors, stock);
      out.push({
        id,
        name,
        cat,
        price,
        wasPrice: onSale ? Math.round((price * 1.32) / 2) * 2 : null,
        imgId,
        images,
        colors,
        tags,
        rating: (4.2 + rnd() * 0.7).toFixed(1),
        reviews: 6 + Math.floor(rnd() * 240),
        stock,
        sku: cat.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() + "-" + (1000 + id),
        desc: "",
        variants,
        _ord: k,
        archived: false,
      });
      id++;
    }
  });
  return out;
}

const descMap: Record<string, string> = {
  "T-Shirts":
    "Cut from midweight organic cotton with a clean, true-to-size body and a ribbed crew neck that holds its shape wash after wash.",
  Knitwear:
    "Knitted from soft, breathable yarn with full-fashioned seams and an easy drape that layers without bulk.",
  Outerwear:
    "Built on a durable, weather-ready shell with a considered fit and hardware chosen to last for years, not seasons.",
  Denim:
    "Woven from honest cotton denim with a clean rinse and a fit that breaks in beautifully and only gets better with wear.",
  Sweats:
    "Brushed-back loopback fleece with a heavyweight hand, ribbed cuffs, and a hem that stays exactly where it should.",
  Shirts:
    "Tailored from a soft, easy-wearing weave with a neat placket and a versatile collar that works on its own or as a layer.",
};

export function desc(p: Product): string {
  return p.desc || descMap[p.cat] || "";
}

const swatchMap: Record<string, string> = {
  Ecru: "#e8e1d3",
  Charcoal: "#3a3a3c",
  Stone: "#a8a095",
  Olive: "#6b6a3c",
  Navy: "#2a3550",
  Rust: "#9a4a2a",
  Sand: "#cdb38a",
  Black: "#1a1714",
  "Heather Grey": "#b9b6b0",
  Forest: "#2f4636",
  Clay: "#b06a4a",
  "Off-White": "#f3efe6",
};

export function swatchHex(name: string): string {
  return swatchMap[name] || "#cccccc";
}

export function badgeOf(p: Product): string {
  if (p.tags.includes("New")) return "New";
  if (p.tags.includes("Bestseller")) return "Bestseller";
  if (p.tags.includes("Limited")) return "Limited";
  if (p.tags.includes("Sale")) return "Sale";
  return "";
}
