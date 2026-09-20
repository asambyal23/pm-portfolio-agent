#!/usr/bin/env node
/**
 * Deploy wrapper: project name comes from env, not hardcoded personal URL.
 *   CLOUDFLARE_PROJECT_NAME=ankush-kumar npm run deploy   # a live site
 *   npm run deploy                                        # default: pm-portfolio
 * Forwards extra args to wrangler. NOTE: `npm run deploy -- --profile X`
 * forwards --profile to preflight AND build; use `npm run deploy -- --profile X`
 * only together with a matching `npm run build -- --profile X` first.
 */
import { spawnSync } from 'node:child_process';

const project = (process.env.CLOUDFLARE_PROJECT_NAME || 'pm-portfolio').trim() || 'pm-portfolio';
const passthrough = process.argv.slice(2).filter((a) => a !== '--allow-stale');
const args = ['wrangler', 'pages', 'deploy', 'dist', `--project-name=${project}`, ...passthrough];
console.log(`→ deploying dist/ to Cloudflare Pages project "${project}"`);
const r = spawnSync('npx', args, { stdio: 'inherit', shell: false });
process.exit(r.status ?? 1);
