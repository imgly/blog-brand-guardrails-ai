/**
 * Step 2: the locked template.
 *
 * One portrait page with four blocks. The template is built in the
 * Creator role, which ignores every lock, and then handed over in the
 * Adopter role, which enforces them:
 *
 *   logo      locked. Not selectable, cannot move, resize or change
 *   image     the placeholder. The user (and step 3's generation) may
 *             replace and crop its image, nothing else
 *   headline  the user may retype it, move and resize it, and pick a
 *             typeface and a text color (`fill/change`), but only from
 *             the brand kit (step 1)
 *   legal     locked, like the logo
 *
 * Every scope is first switched off on every block, then the few a block
 * needs are switched back on. Global scopes are set to Defer so the
 * block settings decide: a global Allow would override a block's lock.
 *
 * @see https://img.ly/docs/cesdk/js/create-templates/lock-131489/
 * @see https://img.ly/docs/cesdk/js/create-templates/add-dynamic-content/placeholders-d9ba8a/
 * @see https://img.ly/docs/cesdk/js/create-templates/add-dynamic-content/set-editing-constraints-c892c0/
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';
import type { CreativeEngine, Scope, Typeface } from '@cesdk/cesdk-js';

import {
  FONTS,
  LOGO,
  LOGO_RULES,
  PALETTE,
  SAFE_AREA_INSET,
  toRGBA
} from './brand-kit';

/** The template's page size, in pixels. */
export const TEMPLATE_PAGE = { width: 1080, height: 1350 };

/** Block names. Generation and the validator find blocks by these. */
export const BLOCK = {
  logo: 'logo',
  image: 'image',
  headline: 'headline',
  legal: 'legal'
} as const;

/** What the user may do with each block. Every other scope is off. */
const ALLOWED: Record<string, Scope[]> = {
  [BLOCK.logo]: [],
  [BLOCK.image]: ['editor/select', 'fill/change', 'layer/crop'],
  [BLOCK.headline]: [
    'editor/select',
    'text/edit',
    'text/character',
    'fill/change',
    'layer/move',
    'layer/resize'
  ],
  [BLOCK.legal]: []
};

const PLACEHOLDER_IMAGE = 'https://img.ly/static/ubq_samples/sample_1.jpg';
const HEADLINE = 'Quiet, wherever you go';
const LEGAL = '© 2026 Northwind Audio. Offer valid at participating stores while stocks last.';

/** A new page with the template on it: what a user starts from. */
export async function startTemplate(cesdk: CreativeEditorSDK): Promise<void> {
  // Deselect first, or the editor's UI keeps pointing at a block of the
  // scene that is about to be replaced.
  for (const block of cesdk.engine.block.findAllSelected()) {
    cesdk.engine.block.setSelected(block, false);
  }
  cesdk.engine.editor.setRole('Creator');
  await cesdk.actions.run('scene.create', {
    page: { ...TEMPLATE_PAGE, unit: 'Pixel' }
  });
  await buildTemplate(cesdk);
}

export async function buildTemplate(cesdk: CreativeEditorSDK): Promise<void> {
  const engine = cesdk.engine;
  engine.editor.setRole('Creator');

  const page = engine.scene.getPages()[0];
  const { width } = TEMPLATE_PAGE;
  const inset = SAFE_AREA_INSET;
  const contentWidth = width - inset * 2;

  engine.block.setColor(
    engine.block.getFill(page),
    'fill/color/value',
    toRGBA(PALETTE.mist)
  );

  // Logo, top left, at a comfortable size above the minimum.
  const logoWidth = 240;
  const logoHeight = logoWidth / LOGO_RULES.aspectRatio;
  // Absolute URL: CE.SDK resolves a relative URI against its own asset
  // base URL, not against this app.
  const logoUrl = new URL(LOGO, window.location.href).href;
  const logo = addImage(engine, page, BLOCK.logo, logoUrl, {
    x: inset,
    y: inset,
    width: logoWidth,
    height: logoHeight
  });

  // The image slot starts below the logo's clear space. It is 4:3, a
  // format the image model in step 3 can produce without cropping.
  const imageTop = inset + logoHeight + logoHeight * LOGO_RULES.clearSpace;
  const imageHeight = (contentWidth * 3) / 4;
  const image = addImage(engine, page, BLOCK.image, PLACEHOLDER_IMAGE, {
    x: inset,
    y: imageTop,
    width: contentWidth,
    height: imageHeight
  });

  const headline = addText(engine, page, BLOCK.headline, HEADLINE, {
    x: inset,
    y: imageTop + imageHeight + 48,
    width: contentWidth,
    fontSize: 72,
    typeface: await brandTypeface(engine, FONTS.headline),
    weight: 'Bold'
  });

  const legalSize = 22;
  const legal = addText(engine, page, BLOCK.legal, LEGAL, {
    x: inset,
    y: TEMPLATE_PAGE.height - inset - legalSize * 1.5,
    width: contentWidth,
    fontSize: legalSize,
    typeface: await brandTypeface(engine, FONTS.body),
    weight: 'Regular'
  });

  // Locks: global scopes defer to the blocks, every block starts with
  // nothing allowed, then gets back only what ALLOWED lists.
  for (const scope of engine.editor.findAllScopes()) {
    engine.editor.setGlobalScope(scope, 'Defer');
  }
  for (const block of [page, logo, image, headline, legal]) {
    for (const scope of engine.editor.findAllScopes()) {
      engine.block.setScopeEnabled(block, scope, false);
    }
    for (const scope of ALLOWED[engine.block.getName(block)] ?? []) {
      engine.block.setScopeEnabled(block, scope, true);
    }
  }

  // The image slot is a placeholder: behavior on the fill, the overlay
  // and Replace button on the block.
  engine.block.setPlaceholderEnabled(image, true);
  engine.block.setPlaceholderBehaviorEnabled(engine.block.getFill(image), true);
  engine.block.setPlaceholderControlsOverlayEnabled(image, true);
  engine.block.setPlaceholderControlsButtonEnabled(image, true);

  engine.editor.setRole('Adopter');
  void engine.scene.zoomToBlock(page, { padding: 40, animate: false });
}

/** Finds a block of the template by its name. */
export function findBlock(engine: CreativeEngine, name: string): number {
  const [block] = engine.block.findByName(name);
  if (block == null) throw new Error(`The template has no "${name}" block`);
  return block;
}

interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * An image block built without `addImage`, which waits for a rendered
 * frame and never returns while the canvas is hidden.
 */
function addImage(
  engine: CreativeEngine,
  page: number,
  name: string,
  uri: string,
  frame: Frame
): number {
  const block = engine.block.create('graphic');
  engine.block.setShape(block, engine.block.createShape('rect'));
  const fill = engine.block.createFill('image');
  engine.block.setString(fill, 'fill/image/imageFileURI', uri);
  engine.block.setFill(block, fill);
  engine.block.setContentFillMode(block, 'Cover');
  engine.block.setPositionX(block, frame.x);
  engine.block.setPositionY(block, frame.y);
  engine.block.setWidth(block, frame.width);
  engine.block.setHeight(block, frame.height);
  engine.block.setName(block, name);
  engine.block.appendChild(page, block);
  return block;
}

function addText(
  engine: CreativeEngine,
  page: number,
  name: string,
  text: string,
  options: {
    x: number;
    y: number;
    width: number;
    fontSize: number;
    typeface: Typeface;
    weight: string;
  }
): number {
  const block = engine.block.create('text');
  engine.block.replaceText(block, text);
  const font =
    options.typeface.fonts.find((f) => f.subFamily === options.weight) ??
    options.typeface.fonts[0];
  engine.block.setFont(block, font.uri, options.typeface);
  engine.block.setFloat(block, 'text/fontSize', options.fontSize);
  engine.block.setTextColor(block, toRGBA(PALETTE.navy));
  engine.block.setWidth(block, options.width);
  engine.block.setHeightMode(block, 'Auto');
  engine.block.setPositionX(block, options.x);
  engine.block.setPositionY(block, options.y);
  engine.block.setName(block, name);
  engine.block.appendChild(page, block);
  return block;
}

/** One of the two approved typefaces, from the brand's font library. */
async function brandTypeface(
  engine: CreativeEngine,
  family: string
): Promise<Typeface> {
  const { assets } = await engine.asset.findAssets('brand.fonts', {
    page: 0,
    perPage: 10
  });
  const typeface = assets.find((a) => a.label === family)?.payload?.typeface;
  if (typeface == null) throw new Error(`${family} is not in the brand fonts`);
  return typeface;
}
