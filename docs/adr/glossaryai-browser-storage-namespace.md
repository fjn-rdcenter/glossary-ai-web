# Namespace all browser storage under `glossaryai_`

In production, Glossary AI is served under a path (`/glossary-ai`) on a domain it shares with other products. localStorage and sessionStorage are scoped to the whole origin, not the path, so a generic key like `auth_token` or `user_logged_out` could be overwritten, read or deleted by a sibling product. We therefore prefix every storage key with a fixed `glossaryai_` and declare all keys in `lib/storage-keys.ts`. The prefix is not derived from `basePath`: the app's internal basePath (`/new`) differs from the public path, and either could change without the stored state having to move. We also turned off next-intl's `NEXT_LOCALE` cookie, because `proxy.ts` never reads it.

## Considered Options

- **Migrate values from the old generic keys (`auth_token`, `user_logged_out`) to the new keys.** Rejected. We cannot tell whether a generic key belongs to Glossary AI or to another product, so copying it could take over someone else's token, and deleting it could log the user out of another app. Users lose nothing by starting from an empty key: the login page silently gets a new access token through the HttpOnly refresh cookie, and the dashboard fetches the user's details again.

## Consequences

- The old generic keys stay in users' browsers and are deliberately left alone. Do not add cleanup code for them.
- Logout removes only `glossaryai_*` keys. Earlier versions also removed generic legacy keys (`onboardingTourCompleted` and similar) and a `refresh_token` cookie at `Path=/`. That cleanup was removed because on a shared domain it deletes other products' data.
