/**
 * Step 1: the brand kit.
 *
 * "Brand kit" here is this app's own config file, not a CE.SDK feature
 * name: the palette, the two approved typefaces, the logo rules and the
 * safe area for one made-up brand. The template (step 2) is built from
 * it, generation (step 3) takes its prompt prefix from it, and the
 * validator (step 4) checks every export against it.
 *
 * `installBrandKit` makes the editor offer these colors and typefaces
 * and nothing else.
 *
 * @see https://img.ly/docs/cesdk/js/rules/enforce-brand-guidelines-23a1e3/
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

/** Colors the user may pick from, as hex. Nothing else is allowed. */
export const PALETTE = {
  blue: '#1E5ADC',
  navy: '#102050',
  mist: '#EEF2FA',
  white: '#FFFFFF'
} as const;

/**
 * The two approved typefaces. Both ship in CE.SDK's default typeface
 * library, so there are no font files to host.
 */
export const FONTS = {
  headline: 'Montserrat',
  body: 'Open Sans'
} as const;

export const ALLOWED_FONTS: readonly string[] = Object.values(FONTS);

/** The approved logo file, served from this app's `public/brand/`. */
export const LOGO = '/brand/logo-dark.png';

export const LOGO_RULES = {
  /** Width to height of the logo files, 600 by 200. */
  aspectRatio: 3,
  /** Smallest width the logo may be exported at, in pixels. */
  minWidth: 180,
  /** Empty space around the logo, as a fraction of its height. */
  clearSpace: 0.5
};

/** Every block must sit this many pixels inside the page edges. */
export const SAFE_AREA_INSET = 64;

/**
 * Content rules, checked by Stream's moderation API in step 4.
 * `scripts/setup-stream.ts` turns them into a Stream moderation policy.
 */
export const MODERATION = {
  policy: 'brand-guardrails',
  blocklist: 'northwind-banned-words',
  /** Claims the brand never makes. Matched as whole words in any text. */
  bannedWords: ['guaranteed', 'cheapest', 'miracle', 'cure'],
  /** Image categories the brand does not want next to its logo. */
  imageCategories: [
    'Explicit',
    'Non-Explicit Nudity',
    'Violence',
    'Visually Disturbing',
    'Drugs & Tobacco',
    'Alcohol',
    'Gambling',
    'Hate Symbols',
    'Rude Gestures'
  ],
  /**
   * How sure the image model must be, 1 to 100. Stream suggests 60 to 70
   * for balanced detection.
   */
  imageMinConfidence: 60
};

/**
 * Put in front of every image prompt, so a generated image starts from
 * the brand's look before the user's own words.
 */
export const PROMPT_PREFIX =
  'Bright, clean commercial photography in cool blue and white tones, ' +
  'natural light, no text, no logos. Subject: ';

/** Hex to the 0 to 1 RGBA the engine uses. */
export function toRGBA(hex: string): { r: number; g: number; b: number; a: number } {
  const value = parseInt(hex.slice(1), 16);
  return {
    r: ((value >> 16) & 0xff) / 255,
    g: ((value >> 8) & 0xff) / 255,
    b: (value & 0xff) / 255,
    a: 1
  };
}

/**
 * Replaces the editor's color and typeface libraries with the brand's.
 *
 * The swatches become the palette, the font list becomes the two approved
 * faces, and the ways around them are switched off: the free color picker
 * (spectrum and hex input), the text style presets, which carry their own
 * fonts and colors, and the colored box behind text, which the template
 * has no use for. A user choosing through the UI then cannot leave the
 * brand kit.
 */
export async function installBrandKit(cesdk: CreativeEditorSDK): Promise<void> {
  const engine = cesdk.engine;

  cesdk.i18n.setTranslations({
    en: {
      'libraries.brand.colors.label': 'Brand colors',
      'libraries.brand.fonts.label': 'Brand fonts'
    }
  });

  engine.asset.addLocalSource('brand.colors');
  for (const [token, hex] of Object.entries(PALETTE)) {
    const { r, g, b } = toRGBA(hex);
    engine.asset.addAssetToSource('brand.colors', {
      id: `brand.color.${token}`,
      label: { en: token },
      payload: { color: { colorSpace: 'sRGB', r, g, b } }
    });
  }
  cesdk.ui.updateAssetLibraryEntry('ly.img.colors', {
    sourceIds: ['brand.colors']
  });

  // The two approved faces, copied from CE.SDK's own typeface library so
  // the font files match the SDK version.
  const { assets } = await engine.asset.findAssets('ly.img.typeface', {
    page: 0,
    perPage: 100
  });
  engine.asset.addLocalSource('brand.fonts');
  for (const asset of assets) {
    if (asset.label != null && ALLOWED_FONTS.includes(asset.label)) {
      engine.asset.addAssetToSource('brand.fonts', {
        id: asset.id,
        label: { en: asset.label },
        payload: asset.payload,
        meta: asset.meta
      });
    }
  }
  cesdk.ui.updateAssetLibraryEntry('ly.img.typefaces', {
    sourceIds: ['brand.fonts']
  });

  cesdk.feature.disable([
    'ly.img.fill.color.picker',
    'ly.img.text.background',
    'ly.img.text.styles'
  ]);
}
