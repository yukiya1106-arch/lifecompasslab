# Retirement COMPASS

Source for `public/tools/retirement-compass/`, restored from the original project
that produced the previously published assets. Calculation modules, individual
tool components and input data types are unchanged.

```sh
npm ci
npm test
npm run build
```

Copy the built `dist/index.html` and `dist/assets/` into the matching public tool
directory. The main site's build publishes these static assets.

Navigation is shared through `ToolNavigation` in `CompassHeader`. App keeps only
visited tools mounted, hiding inactive views with the native hidden attribute.
This retains input and result state within the current browser session without
changing input structures or adding browser storage. Refreshing or leaving the
application still resets local state as before. Existing shared-data updates and
dashboard entry points remain in use. Every view transition resets page scroll.
The existing explicit "continue with these inputs" actions reinitialize the
total diagnosis from shared data as before; tab navigation instead resumes its
previous inputs.
