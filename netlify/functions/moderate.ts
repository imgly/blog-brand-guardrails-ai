/**
 * The content check as a Netlify function, served at /api/moderate.
 * Set STREAM_API_KEY and STREAM_API_SECRET in the site's environment.
 *
 * @see https://docs.netlify.com/functions/get-started/
 */

import { handleModerate } from '../../server/moderate.ts';

export default (request: Request) => handleModerate(request, process.env);

export const config = { path: '/api/moderate' };
