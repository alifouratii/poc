# Comparison modes

This version intentionally keeps the existing comparison flow untouched and adds a second comparison mode.

## Existing mode: endpoint comparison

Button: `Open endpoint comparison`

Uses the original four endpoints:

- `/api/task/get/comparaison/meme-task/left/`
- `/api/task/get/comparaison/meme-task/right/`
- `/api/task/get/index/comparaison/meme-task/left/`
- `/api/task/get/index/comparaison/meme-task/right/`

## New mode: latest vs previous date

Button: `Compare latest vs previous`

Uses `/api/task/get/index/` twice:

- previous available date for the same task/provider/index/scope
- latest available date for the same task/provider/index/scope

If fewer than two matching dates exist, the UI shows a clear unavailable message.

## Important rule

The new date comparison is additive. It does not replace or remove the existing endpoint comparison.
