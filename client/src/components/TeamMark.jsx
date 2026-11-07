import { useEffect, useState } from 'react';
import { teamAccent, teamLogoUrl } from '../teamStyle.js';

/**
 * Team logo, falling back to a dot in the team's colour if there's no logo or it fails to load.
 * `team` needs shortForm plus either `color` or primaryColour/secondaryColour.
 */
export default function TeamMark({ team, size = 18 }) {
  const [failed, setFailed] = useState(false);
  const url = team ? teamLogoUrl(team.shortForm) : null;
  useEffect(() => setFailed(false), [url]);
  if (!team) return null;
  if (url && !failed) {
    return (
      <img src={url} alt="" width={size} height={size} className="team-logo" loading="lazy"
        onError={() => setFailed(true)} />
    );
  }
  const color = team.color ?? teamAccent(team.primaryColour, team.secondaryColour, '#adb5bd');
  return <span className="team-dot" style={{ background: color }} aria-hidden="true" />;
}
