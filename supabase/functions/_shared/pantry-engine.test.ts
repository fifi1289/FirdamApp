import { assert, assertEquals } from "jsr:@std/assert@1";
import { checkNeeds, deductionsFor, Ledger } from "./pantry-engine.ts";
import { householdFrom } from "./pantry-portions.ts";
import { matchScore } from "./pantry-units.ts";

const pantry = [
  { id: "1", name: "Potatoes", quantity: 1, unit: "Pieces" },
  { id: "2", name: "Chicken", quantity: 1.5, unit: "kg" },
  { id: "3", name: "Couscous", quantity: 1, unit: "Pack", tracking: "level" as const, level: "half" as const },
  { id: "4", name: "Onions", quantity: 2, unit: "kg" },
  { id: "5", name: "Eggs", quantity: 12, unit: "Pieces" },
];

Deno.test("one potato is not enough for a family couscous", () => {
  const check = checkNeeds(
    [
      { name: "couscous", quantity: 400, unit: "g" },
      { name: "chicken thighs", quantity: 800, unit: "g" },
      { name: "potatoes", quantity: 4, unit: "pieces" },
      { name: "ground cumin", quantity: 1, unit: "tsp" },
    ],
    pantry,
    { factor: 5 / 4 },
  );
  const potato = check.lines.find((l) => l.need.name === "potatoes")!;
  assertEquals(potato.status, "short");
  assertEquals(potato.shortfall?.quantity, 4);
  assertEquals(check.lines.find((l) => l.need.name === "couscous")!.status, "staple");
  assertEquals(check.lines.find((l) => l.need.name === "ground cumin")!.status, "basic");
  assertEquals(check.verdict, "almost");
});

Deno.test("cooking takes amounts out in the pantry's own units", () => {
  const check = checkNeeds([{ name: "chicken thighs", quantity: 800, unit: "g" }], pantry);
  const [d] = deductionsFor(check);
  assertEquals(d.item.id, "2");
  assertEquals(d.newQuantity, 0.7);
});

Deno.test("a weekly plan doesn't count the same eggs twice", () => {
  const ledger = new Ledger(pantry);
  checkNeeds([{ name: "eggs", quantity: 8, unit: "pieces" }], pantry, { ledger, commit: true });
  const second = checkNeeds([{ name: "eggs", quantity: 6, unit: "pieces" }], pantry, { ledger });
  assertEquals(second.lines[0].status, "short");
});

Deno.test("family portions count children as part portions", () => {
  const year = new Date().getFullYear();
  const h = householdFrom([
    { relationship: "Spouse", birth_date: null },
    { relationship: "Son", birth_date: `${year - 9}-01-01` },
    { relationship: "Daughter", birth_date: `${year - 3}-01-01` },
  ]);
  assertEquals(h.portions, 3.25);
  assertEquals(h.people, 4);
});

Deno.test("names match sensibly", () => {
  assert(matchScore("Chicken", "boneless chicken thighs") >= 2);
  assert(matchScore("Rice", "basmati rice") >= 2);
  assertEquals(matchScore("Oil", "olive oil"), 1);
});
