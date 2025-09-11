# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Changed
- Update postgraphile dependencies to beta.48 (#23)

## [0.2.2] - 2025-05-21
### Fixed
- Rerelease of previous release

## [0.2.1] - 2025-05-21
### Fixed
- Issues with smart tags plugin causing introspection to fail (#20)

## [0.2.0] - 2024-10-16
### Added
- Support subqery \_metadata query(#4)
- GraphiQL control flag - `playground`
- Health check API `/.well-known/apollo/server-health`

### Fixed
- Bigint query type not match

## [0.1.0] - 2024-09-20
### Fixed
- Package rename @subql/query-subgraph

## [0.0.7] - 2024-09-19
### Fixed
- The issue with the packageManager inconsistency during the Docker build process.

## [0.0.6] - 2024-09-19
### Fixed
- Repo generate tag name

## [0.0.5] - 2024-09-19
### Fixed
- Add @actions/core and @geut/chan

## [0.0.4] - 2024-09-19
### Added
- Support GraphQL query style similar to subgraph.

[Unreleased]: https://github.com/subquery/query-subgraph/compare/v0.2.2...HEAD
[0.2.2]: https://github.com/subquery/query-subgraph/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/subquery/query-subgraph/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/subquery/query-subgraph/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/subquery/query-subgraph/compare/v0.0.7...v0.1.0
[0.0.7]: https://github.com/subquery/query-subgraph/compare/v0.0.6...v0.0.7
[0.0.6]: https://github.com/subquery/query-subgraph/compare/v0.0.5...v0.0.6
[0.0.5]: https://github.com/subquery/query-subgraph/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/subquery/query-subgraph/compare/0.0.1...0.0.4
