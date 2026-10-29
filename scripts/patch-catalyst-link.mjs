import { writeFileSync } from 'node:fs';

const target = new URL('../src/components/catalyst/link.tsx', import.meta.url);

const source = `import * as Headless from '@headlessui/react'
import React, { forwardRef } from 'react'
import { Link as RouterLink } from 'react-router'

/**
 * Catalyst's stock Link is a plain anchor. This file is the local patch
 * applied by scripts/patch-catalyst-link.mjs so client navigations stay
 * inside the Vite SPA. Re-run the script after copying a new kit.
 */
export const Link = forwardRef(function Link(
  { href, ...props }: { href: string } & Omit<React.ComponentPropsWithoutRef<'a'>, 'href'>,
  ref: React.ForwardedRef<HTMLAnchorElement>,
) {
  return (
    <Headless.DataInteractive>
      <RouterLink {...props} to={href} ref={ref} />
    </Headless.DataInteractive>
  )
})
`;

writeFileSync(target, source);
console.log(`Patched ${target.pathname}`);
