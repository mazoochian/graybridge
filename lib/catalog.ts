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
  colors: string[];
  tags: string[];
  rating: string;
  reviews: number;
  stock: number;
  sku: string;
  desc: string;
  variants: ProductVariant[];
  _ord: number;
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
    ],
    pre: ["Everyday", "Boxy", "Heavyweight", "Classic", "Relaxed", "Garment-Dyed", "Organic", "Slub", "Vintage", "Pima"],
    suf: ["Tee", "Pocket Tee", "T-Shirt", "Crew Tee"],
    min: 32,
    max: 58,
  },
  Knitwear: {
    ids: ["1556905055-8f358a7a47b2", "1614676471928-2ed0ad1061a4", "1485231183945-fffde7cc051e"],
    pre: ["Merino", "Lambswool", "Cotton", "Chunky", "Fisherman", "Ribbed", "Cashmere-Blend", "Waffle"],
    suf: ["Crew Knit", "Sweater", "Cardigan", "Turtleneck", "Pullover"],
    min: 88,
    max: 178,
  },
  Outerwear: {
    ids: ["1591047139829-d91aecb6caea", "1611312449408-fcece27cdbb7", "1551537482-f2075a1d41f2"],
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
    ],
    pre: ["Selvedge", "Stretch", "Rigid", "Washed", "Tapered", "Straight", "Slim", "Relaxed"],
    suf: ["Jean", "Denim", "Five-Pocket"],
    min: 98,
    max: 188,
  },
  Sweats: {
    ids: ["1556821840-3a63f95609a7", "1620799140188-3b2a02fd9a77"],
    pre: ["Heavyweight", "Loopback", "Brushed", "French Terry", "Garment-Dyed", "Vintage"],
    suf: ["Crewneck", "Hoodie", "Zip Hoodie", "Sweatpant"],
    min: 64,
    max: 128,
  },
  Shirts: {
    ids: ["1602810318383-e386cc2a3ccf", "1596755094514-f87e34085b2c", "1607345366928-199ea26cfe3e"],
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
    for (let k = 0; k < 25; k++) {
      const pre = c.pre[k % c.pre.length];
      const suf = c.suf[(k * 3 + 1) % c.suf.length];
      const name = pre + " " + suf;
      const price = Math.round((c.min + rnd() * (c.max - c.min)) / 2) * 2;
      const imgId = c.ids[k % c.ids.length];
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
        colors,
        tags,
        rating: (4.2 + rnd() * 0.7).toFixed(1),
        reviews: 6 + Math.floor(rnd() * 240),
        stock,
        sku: cat.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() + "-" + (1000 + id),
        desc: "",
        variants,
        _ord: k,
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
