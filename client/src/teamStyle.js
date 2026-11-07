// Team colours and logos from the teams table (shortForm, primaryColour, secondaryColour).

export const TEAM_LOGO_BASE = import.meta.env.VITE_TEAM_LOGO_BASE ?? 'https://dev.tottenhammensleague.com/assets';

export const teamLogoUrl = (shortForm) => (shortForm ? `${TEAM_LOGO_BASE}/${encodeURIComponent(shortForm)}.svg` : null);

const toHex = (c) => {
  const s = String(c ?? '').trim().replace(/^#/, '');
  return /^[0-9a-f]{6}$/i.test(s) ? `#${s.toUpperCase()}` : null;
};

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// White or near-black text, whichever reads better on the given colour.
export const inkOn = (hex) => (luminance(hex) > 0.4 ? '#141a24' : '#ffffff');

/**
 * Accent colour for a team: primary, unless it's too pale to show on white
 * (e.g. Tampa's FFFFFF), then secondary. `avoid` lets the away team switch to
 * its secondary when its primary matches the home team's accent.
 */
export function teamAccent(primary, secondary, fallback, avoid) {
  const p = toHex(primary);
  const s = toHex(secondary);
  const usable = (c) => c && luminance(c) < 0.8;
  let color = usable(p) ? p : usable(s) ? s : fallback;
  if (avoid && color === avoid && usable(s) && s !== avoid) color = s;
  return color;
}

// Pick the home/away team fields off a game row: teamFrom(game, 'home') -> { id, name, shortForm, ... }.
export const teamFrom = (row, side) => ({
  id: row[`${side}Id`],
  name: row[`${side}Name`],
  shortForm: row[`${side}ShortForm`],
  primaryColour: row[`${side}PrimaryColour`],
  secondaryColour: row[`${side}SecondaryColour`],
});
