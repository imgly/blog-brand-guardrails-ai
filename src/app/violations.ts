/**
 * Test harness for the article's "four refusals": each button breaks one
 * brand rule through the engine API, the way a design file from
 * somewhere else or an integration could. The editor's locks don't stop
 * code, so these land, and the validator is what catches them.
 */

import type { CreativeEngine } from '@cesdk/cesdk-js';

import { BLOCK, findBlock } from '../template';

export interface Violation {
  label: string;
  apply: (engine: CreativeEngine) => Promise<void> | void;
}

export const VIOLATIONS: Violation[] = [
  {
    label: 'Off-palette background',
    apply: (engine) => {
      const page = engine.scene.getPages()[0];
      // #E4002B, a red that is not in the palette
      engine.block.setColor(engine.block.getFill(page), 'fill/color/value', {
        r: 228 / 255,
        g: 0,
        b: 43 / 255,
        a: 1
      });
    }
  },
  {
    label: 'Unapproved font',
    apply: async (engine) => {
      // CE.SDK's full library is still registered; only the UI is limited.
      const { assets } = await engine.asset.findAssets('ly.img.typeface', {
        page: 0,
        perPage: 100
      });
      const typeface = assets.find((a) => a.label === 'Lobster Two')?.payload
        ?.typeface;
      if (typeface == null) throw new Error('Lobster Two is not in the library');
      engine.block.setFont(
        findBlock(engine, BLOCK.headline),
        typeface.fonts[0].uri,
        typeface
      );
    }
  },
  {
    label: 'Logo too small',
    apply: (engine) => {
      const logo = findBlock(engine, BLOCK.logo);
      engine.block.setWidth(logo, 120);
      engine.block.setHeight(logo, 40);
    }
  },
  {
    label: 'Headline outside the safe area',
    apply: (engine) => {
      engine.block.setPositionX(findBlock(engine, BLOCK.headline), 16);
    }
  },
  {
    label: 'Banned word in the headline',
    apply: (engine) => {
      engine.block.replaceText(
        findBlock(engine, BLOCK.headline),
        'Guaranteed quiet, wherever you go'
      );
    }
  }
];
