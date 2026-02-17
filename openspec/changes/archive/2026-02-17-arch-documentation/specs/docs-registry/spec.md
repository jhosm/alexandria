## ADDED Requirements

### Requirement: `docs` section in registry file

The registry file (`apis.yml`) SHALL support a top-level `docs` array alongside the existing `apis` array. Each entry in `docs` SHALL have `name` (required string) and `path` (required string, directory path). The `apis` array MAY be absent when only `docs` entries exist, and vice versa.

#### Scenario: Registry with both apis and docs sections

- **WHEN** `apis.yml` contains both `apis` and `docs` arrays
- **THEN** the system SHALL parse both sections and return them as separate collections

#### Scenario: Registry with only docs section

- **WHEN** `apis.yml` contains a `docs` array but no `apis` array
- **THEN** the system SHALL return an empty apis list and the parsed docs entries

#### Scenario: Registry with only apis section (backwards compatible)

- **WHEN** `apis.yml` contains only an `apis` array with no `docs` section
- **THEN** the system SHALL return the parsed apis entries and an empty docs list

### Requirement: Doc entry validation

Each `docs` entry SHALL be validated for required fields. The `path` SHALL be resolved relative to the registry file location, same as `spec` and `docs` paths in API entries.

#### Scenario: Missing name in doc entry

- **WHEN** a `docs` entry has no `name` field
- **THEN** the system SHALL throw an error indicating the missing field

#### Scenario: Missing path in doc entry

- **WHEN** a `docs` entry has a `name` but no `path` field
- **THEN** the system SHALL throw an error indicating the missing field

#### Scenario: Path resolution

- **WHEN** a `docs` entry has `path: ./docs/arch`
- **THEN** the system SHALL resolve it relative to the registry file's directory

### Requirement: Name uniqueness across sections

Entry names SHALL be unique across both `apis` and `docs` sections. The registry loader SHALL collect all names from both sections and throw an error if any name appears more than once.

#### Scenario: Duplicate name across apis and docs

- **WHEN** `apis.yml` has an API entry with `name: "payments"` and a docs entry with `name: "payments"`
- **THEN** the system SHALL throw an error indicating the duplicate name

#### Scenario: Duplicate name within docs section

- **WHEN** `apis.yml` has two docs entries both with `name: "arch"`
- **THEN** the system SHALL throw an error indicating the duplicate name

### Requirement: DocEntry type

The registry loader SHALL return doc entries as a `DocEntry` type with `name: string` and `path: string`, separate from the existing `ApiEntry` type. The return type SHALL be a `RegistryResult` containing both `apis: ApiEntry[]` and `docs: DocEntry[]`.

#### Scenario: Type separation

- **WHEN** the registry is loaded
- **THEN** callers SHALL receive separate typed arrays for apis and docs entries
