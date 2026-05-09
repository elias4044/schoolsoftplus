# Copilot Instructions

## General coding style
- Use only normal, standard ASCII characters unless the file already uses Unicode for a clear reason.
- Avoid special or decorative characters in code, comments, identifiers, and strings unless they are required.

## Comments
- Use clear, simple comments only when they add real value.
- Explain why something exists, not what obvious code already shows.
- Do not add noisy, redundant, or overly verbose comments.

## UI and design
- Follow the existing design system in `global.css`.
- Keep styling consistent with the current app structure, spacing, colors, typography, and layout patterns.
- Prefer reusable UI patterns over one-off styles.
- Focus on clean UX, good hierarchy, clear feedback, and responsive behavior.

## React / frontend
- Prefer small, composable components.
- Keep components accessible and semantic.
- Use predictable state handling and avoid unnecessary complexity.
- Match the project’s existing conventions for hooks, props, and file structure.

## Code quality
- Prefer maintainable solutions over fast hacks.
- Handle edge cases explicitly.
- Preserve existing behavior unless a change is requested.
- Do not introduce unnecessary dependencies.

## Security and safety
- Never suggest storing passwords in localStorage or plaintext in a database.
- Treat tokens, secrets, and credentials as sensitive data.
- Prefer secure, standard authentication and storage patterns.

## Output preferences
- If multiple valid approaches exist, choose the simplest one that fits the codebase.
- Keep generated code consistent with the surrounding project.
- When editing existing files, match the current style instead of forcing a new one.