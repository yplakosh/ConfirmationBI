# ConfirmationBI design implementation notes

This document supplements the versioned visual design in
[`confirmationbi-ui-v1.html`](./confirmationbi-ui-v1.html). It records product
behavior that must remain unambiguous during implementation.

The two layouts missing from the original canvas are illustrated in
[`confirmationbi-ui-v1-addendum.html`](./confirmationbi-ui-v1-addendum.html).

## Source-of-truth order

When the design artifacts disagree, use this order:

1. This implementation-notes document for privacy, publishing, sharing, and interaction behavior.
2. The addendum for the final publish confirmation and mobile gallery layouts.
3. The original v1 HTML canvas for visual language, layout, typography, tokens, and all other screens.
4. [`../wireframe-brief.md`](../wireframe-brief.md) for the original product intent.

Do not silently invent conflicting behavior. Record unresolved decisions before implementation.

## Locked product behavior

### Anonymous generation

- A visitor can generate the first result without registering.
- Registration must not interrupt the generator-to-result payoff.
- The input includes the quiet warning: “Don’t include confidential, identifying, or sensitive information.”
- The existing “For entertainment, not decision-making” disclaimer remains visible.
- Storage duration and deletion behavior for anonymous results must be decided with the implementation stack.

### Sharing is not publishing

- **Share result** creates an unlisted link. It does not add the result to the Hall of Validation.
- After sharing, confirm: “Private link copied. Anyone with this link can view the result. It will not appear in the Hall of Validation.”
- An unlisted link is access by possession, not true private access. Do not label it “private” without that explanation.
- Public gallery visibility is changed only through the publishing flow.

### Publishing is always deliberate

- Selecting **Publish to Hall of Validation** opens the authentication gate when the user is signed out.
- Authentication alone never publishes a result.
- After authentication, return to a final confirmation state that shows the result preview and the exact public consequence.
- The final action is labelled **Publish publicly**.
- The user always has a visible **Back to result** action.
- A successful publication receives a clear confirmation and a link to the public page.
- Cancelling or failing any step leaves the generated result intact and unpublished.

### Authentication copy

- The gate says “Sign in or create a free account,” so it works for new and returning users.
- Email authentication is a magic-link flow. Label its action **Email me a sign-in link**, not “Continue with email.”
- Explain where the link was sent and provide a way to correct the email address.

### Gallery and voting

- The mobile Hall of Validation uses a one-column feed.
- Sort controls scroll horizontally without wrapping: Latest, Most endorsed, and Board approved.
- **Most endorsed** sorts by community votes. Generated confidence scores must not be presented as community validation.
- Before a vote, the control is clearly labelled **Vote** with the current total.
- Opening it presents all three choices: Data checks out, Board approved, and Needs more cherry-picking.
- The selected vote has an explicit selected state and remains understandable without color.
- Voting requires authentication. Cancelling the gate returns to the same gallery card and scroll position.
- Gallery cards open a read-only public result. They never show owner-only publishing controls.

## Accessibility and responsive requirements

- Interactive targets are at least 44 by 44 CSS pixels.
- All keyboard focus uses a visible `focus-visible` treatment.
- Validation-style cards use native radio semantics or an accessible radiogroup with arrow-key behavior.
- Body and functional metadata meet WCAG AA contrast; do not use the palest gray for required labels, methodology, chart axes, or controls.
- Information is never encoded by green, indigo, or an icon alone.
- Motion respects `prefers-reduced-motion`.
- Mobile sticky controls account for safe-area insets and never obscure the methodology disclaimer.

## Visual language to preserve

- IBM Plex Sans for interface copy and headings.
- IBM Plex Mono for metrics, labels, IDs, and methodology.
- Neutral canvas and white working surfaces.
- Indigo is the single analytical/action accent.
- Green is reserved for validation signals, not decoration.
- Ten-pixel card radius, eight-pixel control radius, and the existing eight-pixel spacing scale.
- Sincere enterprise-dashboard composition; humor comes from the content and microcopy.
- No decorative gradients, novelty illustrations, emoji, or generic SaaS feature sections.

## Decisions to make with the implementation stack

- Anonymous result storage duration and deletion policy.
- Whether unlisted share links expire or can be revoked.
- Whether the anonymous result is stored before the user chooses to share.
- Authentication provider and magic-link callback behavior.
- Public display-name defaults and profile rules.
- Moderation and reporting behavior for published decisions.
- Rate limits, caching, and the global AI spending ceiling.
