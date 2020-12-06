# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.0] - 2020-12-06
### Added
- Added Redaction Feature that removes columns from records in API responses, but retains query funtionality for the redacted dimension.
### Patched
- Patched Permission Logic. `resourcePermissions` respected if provided, else defaults to `systemPermissions`.
- Patched query.context.seperator functionality.

## [1.3.4] - 2020-12-04
### Added
- Patched joi assignment based on db type prefix (in postgresql)

## [1.3.3] - 2020-12-01
### Added
- Disabled joi assignment based on db type prefix (in postgresql).

## [1.3.2] - 2020-11-28
### Added
- Patched fixed immutable issue with custom migration scripts.

## [1.3.1] - 2020-11-28
### Added
- Patched function broken by bad object key. Also fixed immutable issue.

## [1.3.0] - 2020-11-28
### Added
- Developed better modularMigration functionality (implemented in `service-engine-docker`)

## [1.2.1] - 2020-11-22
### Added
- Export support functions added in previous release.

## [1.2.0] - 2020-11-22
### Added
- Added support functions for new migration support

## [1.1.0] - 2020-11-22
### Added
- Support for naming schema migration scripts. Will be used to seperate SQL from JS in template apps.
- Initial Changelog

## [1.0.0] - 2020-11-08
### Added
- Initial Release

[Unreleased]: https://github.com/sudowing/service-engine/compare/HEAD...v1.4.0
[1.4.0]: https://github.com/sudowing/service-engine/compare/v1.3.4...v1.4.0
[1.3.4]: https://github.com/sudowing/service-engine/compare/v1.3.3...v1.3.4
[1.3.3]: https://github.com/sudowing/service-engine/compare/v1.3.2...v1.3.3
[1.3.2]: https://github.com/sudowing/service-engine/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/sudowing/service-engine/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/sudowing/service-engine/compare/v1.2.1...v1.3.0
[1.2.1]: https://github.com/sudowing/service-engine/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/sudowing/service-engine/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/sudowing/service-engine/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/sudowing/service-engine/releases/tag/v1.0.0

