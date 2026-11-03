/**
 * Step 4: the export validator.
 *
 * The locks from step 2 stop a user breaking the brand in the editor.
 * They don't bind code: a design loaded from a file, changed by an
 * integration, or edited through the API can hold any color, font or
 * size. So every check below runs on the design as it is, however it
 * got that way, and step 5 refuses to export until all of them pass.
 *
 * Each check returns the rule, whether it passed, and a message someone
 * who isn't a designer can act on.
 */

import type { CreativeEngine } from '@cesdk/cesdk-js';

import {
  ALLOWED_FONTS,
  LOGO_RULES,
  MODERATION,
  PALETTE,
  SAFE_AREA_INSET
} from './brand-kit';
import { moderateDesign } from './moderation';
import { BLOCK } from './template';

export interface CheckResult {
  rule: string;
  passed: boolean;
  message: string;
}

export async function validate(engine: CreativeEngine): Promise<CheckResult[]> {
  return [
    checkPalette(engine),
    checkFonts(engine),
    checkLogoSize(engine),
    checkLogoClearSpace(engine),
    checkSafeArea(engine),
    await checkContent(engine)
  ];
}

/** Every fill and every text color is one of the palette's colors. */
function checkPalette(engine: CreativeEngine): CheckResult {
  const rule = 'Every color comes from the brand palette';
  const allowed: string[] = Object.values(PALETTE);
  const problems: string[] = [];

  for (const block of [page(engine), ...designBlocks(engine)]) {
    const colors =
      engine.block.getType(block) === '//ly.img.ubq/text'
        ? engine.block.getTextColors(block)
        : colorFill(engine, block);
    for (const color of colors) {
      const hex = toHex(color);
      if (!allowed.includes(hex)) problems.push(`${label(engine, block)} is ${hex}`);
    }
  }
  return result(rule, problems, `Use a palette color: ${allowed.join(', ')}.`);
}

/** Every text uses one of the approved typefaces. */
function checkFonts(engine: CreativeEngine): CheckResult {
  const rule = `Text uses ${ALLOWED_FONTS.join(' or ')}`;
  const problems: string[] = [];
  for (const block of engine.block.findByType('text')) {
    for (const typeface of engine.block.getTypefaces(block)) {
      if (!ALLOWED_FONTS.includes(typeface.name)) {
        problems.push(`${label(engine, block)} uses ${typeface.name}`);
      }
    }
  }
  return result(rule, problems, 'Pick one of the brand typefaces.');
}

/** The logo is there, at least the minimum width. */
function checkLogoSize(engine: CreativeEngine): CheckResult {
  const rule = `The logo is at least ${LOGO_RULES.minWidth} px wide`;
  const logo = engine.block.findByName(BLOCK.logo)[0];
  if (logo == null) return result(rule, ['The logo is missing'], '');
  const { width } = bounds(engine, logo);
  return result(
    rule,
    width < LOGO_RULES.minWidth ? [`The logo is ${Math.round(width)} px wide`] : [],
    `Set it back to ${LOGO_RULES.minWidth} px or wider.`
  );
}

/** No other block sits in the empty margin around the logo. */
function checkLogoClearSpace(engine: CreativeEngine): CheckResult {
  const rule = 'Nothing sits in the clear space around the logo';
  const logo = engine.block.findByName(BLOCK.logo)[0];
  if (logo == null) return result(rule, ['The logo is missing'], '');
  const box = bounds(engine, logo);
  const margin = box.height * LOGO_RULES.clearSpace;
  const zone = {
    x: box.x - margin,
    y: box.y - margin,
    width: box.width + margin * 2,
    height: box.height + margin * 2
  };
  const problems = designBlocks(engine)
    .filter((block) => block !== logo && overlaps(zone, bounds(engine, block)))
    .map((block) => `${label(engine, block)} is inside it`);
  return result(
    rule,
    problems,
    `Keep ${Math.round(margin)} px clear on every side of the logo.`
  );
}

/** Every block stays inside the page's safe area. */
function checkSafeArea(engine: CreativeEngine): CheckResult {
  const rule = `Everything sits ${SAFE_AREA_INSET} px inside the page edges`;
  const pageBox = bounds(engine, page(engine));
  const problems: string[] = [];
  for (const block of designBlocks(engine)) {
    const box = bounds(engine, block);
    const outside = Math.max(
      SAFE_AREA_INSET - box.x,
      SAFE_AREA_INSET - box.y,
      box.x + box.width - (pageBox.width - SAFE_AREA_INSET),
      box.y + box.height - (pageBox.height - SAFE_AREA_INSET)
    );
    if (outside > 0.5) {
      problems.push(`${label(engine, block)} is ${Math.round(outside)} px outside it`);
    }
  }
  return result(rule, problems, 'Move it back inside the safe area.');
}

/**
 * Stream's moderation check on the rendered design and its text. If the
 * check can't run, the export is refused: an unchecked design is not a
 * passing one.
 */
async function checkContent(engine: CreativeEngine): Promise<CheckResult> {
  const rule = 'Image and text pass the content check';
  try {
    const verdicts = await moderateDesign(engine);
    const problems = verdicts
      .filter((verdict) => verdict.action !== 'keep')
      .map((verdict) => {
        if (verdict.action === 'error') {
          return `The ${verdict.field} could not be checked (${verdict.labels.join(', ')})`;
        }
        // Stream names the blocklist that matched, not the word.
        if (verdict.labels.includes(MODERATION.blocklist)) {
          return `The ${verdict.field} uses a word the brand doesn't allow (${MODERATION.bannedWords.join(', ')})`;
        }
        return `The ${verdict.field} was refused: ${verdict.labels.join(', ') || verdict.action}`;
      });
    return result(rule, problems, 'Change the image or the wording.');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return result(
      rule,
      [`The check could not run (${reason})`],
      'Export stays blocked until it can.'
    );
  }
}

function result(rule: string, problems: string[], fix: string): CheckResult {
  return problems.length === 0
    ? { rule, passed: true, message: 'OK' }
    : { rule, passed: false, message: `${problems.join('; ')}. ${fix}`.trim() };
}

function page(engine: CreativeEngine): number {
  return engine.scene.getPages()[0];
}

/** Every block on the page, including any inside groups. */
function designBlocks(engine: CreativeEngine): number[] {
  const all: number[] = [];
  const walk = (parent: number) => {
    for (const child of engine.block.getChildren(parent)) {
      all.push(child);
      walk(child);
    }
  };
  walk(page(engine));
  return all;
}

/** A block's box relative to the page, whatever its rotation. */
function bounds(engine: CreativeEngine, block: number) {
  const pageBlock = page(engine);
  return {
    x:
      engine.block.getGlobalBoundingBoxX(block) -
      engine.block.getGlobalBoundingBoxX(pageBlock),
    y:
      engine.block.getGlobalBoundingBoxY(block) -
      engine.block.getGlobalBoundingBoxY(pageBlock),
    width: engine.block.getGlobalBoundingBoxWidth(block),
    height: engine.block.getGlobalBoundingBoxHeight(block)
  };
}

type Box = ReturnType<typeof bounds>;

function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

/** The color of a block's fill, if the fill is a plain color. */
function colorFill(engine: CreativeEngine, block: number) {
  if (!engine.block.supportsFill(block)) return [];
  const fill = engine.block.getFill(block);
  if (engine.block.getType(fill) !== '//ly.img.ubq/fill/color') return [];
  return [engine.block.getColor(fill, 'fill/color/value')];
}

function toHex(color: any): string {
  if (!('r' in color)) return 'a non-RGB color';
  const channel = (value: number) =>
    Math.round(value * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`;
}

function label(engine: CreativeEngine, block: number): string {
  if (block === page(engine)) return 'The page background';
  const name = engine.block.getName(block);
  return name ? `The ${name}` : `Block ${block}`;
}
