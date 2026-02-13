## EXISTING Requirements (verified)

### Requirement: All per-widget overrides are unsettable

Every per-widget style override (font family, background colour, background opacity, text colour) SHALL have a visible reset button that clears the override back to `undefined`, causing the global default to apply. This requirement was introduced in the global styling change and is verified here after the removal of the `liveBg` override.

#### Scenario: Font override has reset button

- **WHEN** a widget instance has a `fontFamily` override set
- **THEN** a reset button (x) SHALL be visible next to the font picker in the advanced section
- **AND** clicking it SHALL set `fontFamily` to `undefined`

#### Scenario: Background colour override has reset button

- **WHEN** a widget instance has a `bgColour` override set
- **THEN** a reset button (x) SHALL be visible next to the colour picker
- **AND** clicking it SHALL set `bgColour` to `undefined`

#### Scenario: Background opacity override has reset button

- **WHEN** a widget instance has a `bgOpacity` override set
- **THEN** a reset button (x) SHALL be visible next to the opacity slider
- **AND** clicking it SHALL set `bgOpacity` to `undefined`

#### Scenario: Text colour override has reset button

- **WHEN** a widget instance has a `textColour` override set
- **THEN** a reset button (x) SHALL be visible next to the text colour picker
- **AND** clicking it SHALL set `textColour` to `undefined`

#### Scenario: Reset buttons hidden when no override is active

- **WHEN** a per-widget override field is `undefined` (using global default)
- **THEN** no reset button SHALL be shown for that field

### Requirement: No liveBg override in advanced settings

After the liveBg removal, the advanced section SHALL contain exactly four overrideable settings: font family, background colour, background opacity, and text colour.

#### Scenario: Advanced section contains four override controls

- **WHEN** a widget's advanced settings section is expanded
- **AND** the widget type is not in the self-font-widgets set
- **THEN** exactly four override controls SHALL be present: font override, background colour, BG opacity, and text colour
- **AND** no live background checkbox SHALL be present

#### Scenario: Self-font widgets show three override controls

- **WHEN** a widget whose type is in `SELF_FONT_WIDGETS` (e.g. "stream-title", "custom-text") has its advanced section expanded
- **THEN** exactly three override controls SHALL be present: background colour, BG opacity, and text colour
- **AND** no font override or live background controls SHALL be present
