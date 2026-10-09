# TailAdmin adaptation

UI source: https://github.com/TailAdmin/free-react-tailwind-admin-dashboard

The ShadowVale internal portal adapts the free TailAdmin React template's dark
palette, typography, sidebar navigation, cards, tables, controls and badges.
`Badge.tsx` and `Table.tsx` come from the upstream UI components. Table's class
helper is local and it accepts `colSpan` for expanded content review rows.
`tailadmin-theme.css` maps the template's design tokens to existing ShadowVale
components; this project retains its current Tailwind version and role routes.

Upstream stylesheet reference is preserved in `upstream.css.txt`; it is not
loaded because it targets Tailwind 4. License: MIT, Copyright (c) 2023 TailAdmin,
see `LICENSE.md`. No template assets, screenshots or logos are redistributed.
