# Architecture Delta — v0.1.7-alpha.1.1

## Boot isolation
Project Studio moved from the initial static ES-module dependency graph to route-scoped lazy loading. The Platform Shell now depends only on long-lived baseline modules; Project Studio becomes an optional feature module loaded when its route is requested.

## Failure domains
- Core boot failures are surfaced directly on the boot screen.
- Project Studio load failures are contained to the Project Studio route and no longer take down the shell.
- Boot watchdog detects unresolved startup/partial deployment states.

## Compatibility
Project storage schema v1, runtime provider contracts, Code Studio workspaces and lesson/progress data are unchanged.
