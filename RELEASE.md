# Release Checklist

Marky is prepared for npm publication under `@maurogoncalo/marky`, with the MIT license and public
npm access. Treat the commands in this file as intentional release steps, not as part of ordinary
development.

## Before Publishing

- Confirm the public GitHub repository is `https://github.com/mintyPT/marky`.
- Confirm the npm package is `@maurogoncalo/marky` and the npm account or organization owns that
  scope.
- Confirm the version in `package.json` is the version to publish.
- Confirm `LICENSE`, `README.md`, package metadata, repository links, and examples are current.
- Confirm npm provenance is desired for the GitHub Actions publish workflow.

## Local Verification

Run the full local release check:

```bash
npm run release:check
```

This type-checks, runs unit and integration tests, builds `dist`, and verifies the package dry-run
includes the library entry points, declaration files, README, license, and executable `marky`
binary.

To inspect the package contents manually:

```bash
npm run pack:dry
```

## Publishing

Do not publish from routine CI. The GitHub Actions publish workflow is manual-only and requires the
operator to type the package name before it can publish.

The npm package owner must first authorize this repository as a trusted publisher:

```bash
npm install -g npm@latest
npm trust github @maurogoncalo/marky \
  --repo mintyPT/marky \
  --file publish.yml \
  --allow-publish \
  --yes
```

To publish through GitHub Actions, run the "Publish to npm" workflow on `main` and enter:

```text
@maurogoncalo/marky
```

The workflow bumps `package.json` and `package-lock.json` to the next unused patch version when the
committed version already exists on npm or already has a git tag, runs `npm run release:check`,
commits and tags that release version, and publishes with public access and provenance.
