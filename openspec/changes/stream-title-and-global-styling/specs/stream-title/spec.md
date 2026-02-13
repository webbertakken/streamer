## ADDED Requirements

### Requirement: Display-mode toggle in settings
The stream title widget SHALL have a settings popover (via `settingsComponent`) containing a checkbox labelled "Show outside edit mode" that controls the `showOutsideEditMode` config field.

#### Scenario: Toggle is off by default
- **WHEN** a new stream title widget instance is created
- **THEN** the `showOutsideEditMode` config SHALL default to `false`

#### Scenario: User enables display outside edit mode
- **WHEN** the user checks "Show outside edit mode" in the stream title settings
- **THEN** the widget SHALL remain visible when edit mode is deactivated

#### Scenario: User disables display outside edit mode
- **WHEN** the user unchecks "Show outside edit mode"
- **THEN** the widget SHALL hide when edit mode is deactivated (original behaviour)

### Requirement: Font family setting with fuzzy search
The stream title settings SHALL include a font family input that uses `window.queryLocalFonts()` to enumerate system-installed fonts and provides fzf-style fuzzy autocomplete.

#### Scenario: Font list loaded on settings open
- **WHEN** the user opens the stream title settings for the first time
- **THEN** the system SHALL call `queryLocalFonts()` and cache unique font family names

#### Scenario: Fuzzy search filters fonts
- **WHEN** the user types into the font input
- **THEN** a dropdown SHALL display fonts ranked by fuzzy match score against the input

#### Scenario: Font selected from autocomplete
- **WHEN** the user selects a font from the dropdown
- **THEN** the widget config `fontFamily` SHALL update and the title text SHALL render in that font

#### Scenario: queryLocalFonts unavailable
- **WHEN** the `queryLocalFonts` API is not available or permission is denied
- **THEN** the input SHALL still accept free-text font family names without autocomplete

#### Scenario: Default font
- **WHEN** no font has been selected (value is "inherit")
- **THEN** the title text SHALL render in the inherited default font

### Requirement: Font size setting
The stream title settings SHALL include a numeric input for font size in pixels, with a range of 10–48.

#### Scenario: Default font size
- **WHEN** a new stream title widget is created
- **THEN** the `fontSize` config SHALL default to 14

#### Scenario: User changes font size
- **WHEN** the user sets the font size to a value within 10–48
- **THEN** the title text SHALL render at the specified pixel size

### Requirement: Text colour setting
The stream title settings SHALL include a colour picker for text colour.

#### Scenario: Default text colour
- **WHEN** a new stream title widget is created
- **THEN** the `textColour` config SHALL default to `"#ffffff"`

#### Scenario: User changes text colour
- **WHEN** the user selects a new text colour
- **THEN** the title text SHALL render in the chosen colour

### Requirement: Background colour setting
The stream title settings SHALL include a colour picker for background colour.

#### Scenario: Default background colour
- **WHEN** a new stream title widget is created
- **THEN** the `backgroundColour` config SHALL default to `"transparent"`

#### Scenario: User sets a background colour
- **WHEN** the user selects a non-transparent background colour
- **THEN** the widget SHALL render with that background colour behind the title text

### Requirement: Styled rendering
The stream title widget SHALL apply all config styling fields (`fontFamily`, `fontSize`, `textColour`, `backgroundColour`) as inline styles on the title display element.

#### Scenario: All styling fields applied together
- **WHEN** the widget renders with custom font, size, colour, and background
- **THEN** the title element SHALL have `fontFamily`, `fontSize`, `color`, and `backgroundColor` set to the config values
