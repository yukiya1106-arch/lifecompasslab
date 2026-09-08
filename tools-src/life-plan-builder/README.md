# LIFE PLAN BUILDER source

This directory contains the original v1.0 source and the published investment
enhancements. The LAB website serves the build under
`public/tools/life-plan-builder/`.

From this directory:

```sh
npm ci
npm run lint
npm test
npm run build
```

Copy `dist/index.html` and its referenced `dist/assets/` files to
`../../public/tools/life-plan-builder/`. Preserve the LAB home link in the HTML.
The parent website's build publishes these static files without rebuilding this
application. No parent dependencies need to change.

## Capital plans

Amounts are in ten-thousand yen. Capital plans allocate existing cash or taxable
assets at the selected age; they do not add initial wealth. A cash allocation is
limited to that year's available cash after household cashflow and recurring
contributions. Multiple plans use funds in list order. Short allocations appear
in the simulation warnings and annual events.

Compound plans accrue annual returns for exactly the selected number of years,
then return the balance to cash at the beginning of the following year.
Withdrawal plans use annual beginning-of-year withdrawals (annuity due), followed
by growth on the remaining balance. Household deficits can require additional
withdrawals. Each capital account has its own balance, rate, term and payout.
Existing recurring plans retain their common withdrawal settings.

Legacy JSON files and local storage remain supported. `capitalPlans` is optional;
no new capital account is introduced when an old file is imported.
