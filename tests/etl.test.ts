import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runEtl } from "@/lib/etl";
import { mergeNames } from "@/lib/merge";
import { normalizePhone, formatPhone } from "@/lib/phone";
import { resolveAreaToken, suggestAreas } from "@/lib/areas";
import { CURATED_AREAS } from "@/lib/area-taxonomy";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (f: string) => readFileSync(join(__dirname, "fixtures", f), "utf8");

describe("normalizePhone", () => {
  it("handles common formats", () => {
    expect(normalizePhone("98450 98713")).toBe("+919845098713");
    expect(normalizePhone("+91 98450 98713")).toBe("+919845098713");
    expect(normalizePhone("919845098713")).toBe("+919845098713");
    expect(normalizePhone("09845098713")).toBe("+919845098713");
    expect(normalizePhone("(98450) 98713")).toBe("+919845098713");
  });
  it("rejects invalid numbers", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("1234567890")).toBeNull();
    expect(normalizePhone("98450 9871")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
  it("formats for display", () => {
    expect(formatPhone("+919845098713")).toBe("+91 98450 98713");
  });
});

describe("area resolution", () => {
  it("resolves aliases", () => {
    expect(resolveAreaToken("OMR")?.slug).toBe("old-madras-road");
    expect(resolveAreaToken("hsr")?.slug).toBe("hsr-layout");
    expect(resolveAreaToken("Koramangla")?.slug).toBe("koramangala");
    expect(resolveAreaToken("Indranagar")?.slug).toBe("indiranagar");
    expect(resolveAreaToken("JP Nagar")?.slug).toBe("j-p-nagar");
    expect(resolveAreaToken("Old Airport Rd")?.slug).toBe("old-airport-road");
    expect(resolveAreaToken("HRBR")?.slug).toBe("kalyan-nagar");
    expect(resolveAreaToken("Kudlu Gate")?.slug).toBe("singasandra");
    expect(resolveAreaToken("Jayamahal")?.slug).toBe("rt-nagar");
    expect(resolveAreaToken("Atlantis")).toBeNull();
  });
  it("suggests by prefix and substring", () => {
    const s = suggestAreas("indra");
    expect(s[0]?.slug).toBe("indiranagar");
    expect(suggestAreas("white").some((a) => a.slug === "whitefield")).toBe(true);
  });
  it("migration SQL stays in sync with taxonomy", () => {
    const migrationsDir = join(__dirname, "..", "supabase", "migrations");
    const sql = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .map((f) => readFileSync(join(migrationsDir, f), "utf8"))
      .join("\n");
    const sqlSlugs = [...sql.matchAll(/\('([^']+)',\s*'([a-z0-9-]+)'/g)].map((m) => m[2]);
    const tsSlugs = CURATED_AREAS.map((a) => a.slug);
    expect(new Set(sqlSlugs)).toEqual(new Set(tsSlugs));
    expect(sqlSlugs.length).toBe(tsSlugs.length);
  });
});

describe("mergeNames", () => {
  it("merges token-subset variants without conflict", () => {
    const r = mergeNames(["Babu", "Nova Babu"]);
    expect(r.primary).toBe("Nova Babu");
    expect(r.conflict).toBe(false);
    const r2 = mergeNames(["Manjunath", "Manjunath N"]);
    expect(r2.primary).toBe("Manjunath N");
    expect(r2.conflict).toBe(false);
  });
  it("flags genuinely different names", () => {
    const r = mergeNames(["Devraj", "Manvith"]);
    expect(r.conflict).toBe(true);
    expect(r.primary).toBe("Manvith");
    expect(r.aliases).toContain("Devraj");
  });
});

const result = runEtl({
  sheet1: fixture("sheet1.tsv"),
  sheet2: fixture("sheet2.tsv"),
  sheet3: fixture("sheet3.tsv"),
  sheet4: fixture("sheet4.tsv"),
});

function card(phone: string) {
  return result.cards.find((c) => c.phone === phone);
}

describe("runEtl over fixtures", () => {
  it("parses all rows with no rejects", () => {
    expect(result.totalRows).toBe(30);
    expect(result.rejects).toHaveLength(0);
  });

  it("produces the expected number of merged cards", () => {
    expect(result.cards).toHaveLength(26);
  });

  it("extracts areas from comments in sheet1", () => {
    const venkat = card("+919740284444");
    expect(venkat?.areaSlugs).toEqual(["indiranagar"]);
    const rajesh = card("+918105152222");
    expect(rajesh?.areaSlugs).toEqual(["ulsoor"]);
    expect(rajesh?.displayName?.replace(/\s+/g, " ")).toMatch(/Rajesh/);
    expect(rajesh?.landmarks.join(" ").toLowerCase()).toContain("orchard green");
  });

  it("folds CV Raman Societies into CV Raman Nagar via alias scan", () => {
    const devraj = card("+919986923333");
    expect(devraj?.areaSlugs).toContain("cv-raman-nagar");
  });

  it("leaves hintless sheet1 rows untagged", () => {
    const prashanth = card("+919945401111");
    expect(prashanth?.areaSlugs).toEqual([]);
  });

  it("never leaks zone labels like East/Central into area tags", () => {
    const sheet4Phones = ["+918105811111", "+916364373100", "+919844122222", "+918660933333", "+918025252444", "+917892455555", "+916238366666"];
    const sheet4Cards = result.cards.filter((c) => sheet4Phones.includes(c.phone));
    expect(sheet4Cards.length).toBe(7);
    expect(sheet4Cards.every((c) => !c.areaSlugs.includes("central"))).toBe(true);
  });

  it("cleans broker noise tokens out of names", () => {
    expect(card("+919916615556")?.displayName).toBe("Abhilash");
    expect(card("+919901159015")?.displayName).toBe("Alita Bhattacharya");
    const yogesh = card("+919880532309");
    expect(yogesh?.displayName).toBe("Yogesh");
    expect(yogesh?.areaSlugs).toEqual(["koramangala"]);
    const nestaway = card("+919611130111");
    expect(nestaway?.displayName).toBe("NestAway Property");
  });

  it("nulls generic Broker N names but keeps areas", () => {
    const jp = card("+919742099063");
    expect(jp?.displayName).toBeNull();
    expect(jp?.areaSlugs).toEqual(["j-p-nagar"]);
  });

  it("merges same-phone dual-area rows into one wildcard-named card", () => {
    const dup = card("+919999107707");
    expect(dup?.addedBy).toBe(2);
    expect(dup?.displayName).toBeNull();
    expect(dup?.areaSlugs.sort()).toEqual(["btm-layout", "j-p-nagar"]);
  });

  it("unions areas across sheets for the same phone", () => {
    const basawraj = card("+919663169077");
    expect(basawraj?.addedBy).toBe(2);
    expect(basawraj?.displayName).toBe("Basawraj");
    expect(basawraj?.areaSlugs.sort()).toEqual(["haralur", "koramangala"]);
  });

  it("flags cross-sheet name conflicts as primary + alias", () => {
    const devraj = card("+919986923333");
    expect(devraj?.hasNameConflict).toBe(true);
    expect(devraj?.displayName).toBe("Manvith");
    expect(devraj?.aliases).toContain("Devraj");
    expect(devraj?.addedBy).toBe(2);
    expect(devraj?.areaSlugs.sort()).toEqual([
      "cv-raman-nagar",
      "indiranagar",
      "old-madras-road",
    ]);
  });

  it("splits multi-area cells", () => {
    const vishesh = card("+919591313477");
    expect(vishesh?.areaSlugs.sort()).toEqual([
      "cv-raman-nagar",
      "indiranagar",
      "old-madras-road",
    ]);
  });

  it("warns on unrecognized areas instead of dropping rows", () => {
    const anshuman = card("+917876217486");
    expect(anshuman).toBeDefined();
    expect(anshuman?.areaSlugs).toEqual([]);
    expect(result.warnings.some((w) => w.message.includes("Shapoorji"))).toBe(true);
  });
});

describe("structured directory sheet (sheet4)", () => {
  it("uses the contact person as the name and keeps the firm for the byline", () => {
    const mahi = card("+918105811111");
    expect(mahi?.displayName).toBe("Mahi Krishna");
    expect(mahi?.firm).toBe("MK Real Estate");
    expect(mahi?.areaSlugs).toEqual(["bellandur"]);
    expect(mahi?.notes).toBe("");
  });

  it("falls back to the firm as the name when no contact person exists", () => {
    const roomskart = card("+916238366666");
    expect(roomskart?.displayName).toBe("Roomskart Property Management");
    expect(roomskart?.firm).toBeNull();
    expect(roomskart?.areaSlugs).toEqual(["hsr-layout"]);
  });

  it("resolves slash-separated area cells via alias tokens", () => {
    expect(card("+919844122222")?.areaSlugs.sort()).toEqual(["banaswadi", "kammanahalli"]);
    expect(card("+918660933333")?.areaSlugs).toEqual(["rt-nagar"]);
    expect(card("+918025252444")?.displayName).toBe("BLR Properties");
    expect(card("+918025252444")?.areaSlugs).toEqual(["kalyan-nagar"]);
    expect(card("+917892455555")?.areaSlugs).toEqual(["singasandra"]);
  });

  it("merges a directory row into an existing phone from sheet1", () => {
    const embassy = card("+916364373100");
    expect(embassy?.addedBy).toBe(2);
    expect(embassy?.hasNameConflict).toBe(false);
    expect(embassy?.displayName).toBe("Ashiq / Suhair / Lateef");
    expect(embassy?.firm).toBe("Embassy Property Consultant");
    expect(embassy?.areaSlugs).toEqual(["domlur"]);
    expect(embassy?.notes).toContain("premium/family");
    expect(embassy?.notes).not.toContain("Rental focus");
  });
});
