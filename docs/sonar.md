# Sonar integration

The GitHub Actions workflow in `.github/workflows/sonar.yml` analyzes pushes to
`main` and pull requests from branches in this repository. Pull requests from
forks are skipped because GitHub does not expose repository secrets to them.

## External setup

The GitHub repository must be imported as a SonarQube Cloud project and its
analysis method must be set to **GitHub Actions**. Do not commit the resulting
token or project identifiers.

Configure these GitHub repository variables under **Settings > Secrets and
variables > Actions > Variables**:

- `SONAR_PROJECT_KEY`: the project key shown in the Sonar project.
- `SONAR_ORGANIZATION`: the SonarQube Cloud organization key.

Configure this GitHub repository secret under **Settings > Secrets and
variables > Actions > Secrets**:

- `SONAR_TOKEN`: a SonarQube Cloud analysis token scoped according to the
  organization's plan.

Install or authorize the SonarQube Cloud GitHub app for the repository and bind
the SonarQube Cloud project to the GitHub repository.

## Coverage

Run coverage locally with:

```sh
npm run test:coverage
```

Vitest writes the LCOV report to `coverage/lcov.info`. The coverage directory
is ignored by Git and is read by Sonar through
`sonar.javascript.lcov.reportPaths`.

The Sonar analysis itself is CI-driven: after the external variables and
secret below are configured, pushing to `main` or opening/updating a pull
request triggers it. No SonarScanner package or credential is added to the
local project. A local scan is therefore intentionally not available until a
developer installs a compatible SonarScanner separately and supplies the same
project, organization, and token through their local process environment.

## Analysis scope

Production TypeScript and TSX files below `src` are analyzed. Test files below
`src` are classified as tests rather than production sources. The following
paths are excluded from source analysis:

- `src/test/**`: Vitest test setup, not production code.
- `src/data/mock/**`: generated fictional JSON fixture, not executable code.
- `src/assets/**`: static image assets, not analyzable application code.

The scanner receives tracked repository content within the configured scope
and the generated LCOV report. Local exports matching `datenkrake_*.json`, the
root `exports` directory, `.env` files, build output, dependencies, and coverage
artifacts are ignored by Git. Never add real Redmine responses, customer data,
local JSON exports, or secrets to tracked source or test fixtures: tracked
content can be sent to the configured Sonar service during analysis.

## Pull requests and Quality Gate

The scanner automatically obtains branch and pull-request context from GitHub
Actions. The native GitHub integration publishes the Quality Gate as a GitHub
check and decorates pull requests.

After the first successful analysis, add the Sonar Quality Gate check to the
required status checks for `main` under the repository branch protection or
ruleset settings. This external GitHub setting is what prevents merging when
the Quality Gate fails. The exact check name becomes available after Sonar has
reported it once.

No Sonar identity is stored in `sonar-project.properties`; the workflow reads
it from GitHub variables so the repository cannot accidentally point at an
unrelated production project.
