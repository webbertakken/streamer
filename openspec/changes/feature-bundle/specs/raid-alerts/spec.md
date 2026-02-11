# Raid alerts specification

## ADDED Requirements

### Requirement: Queue-based raid alert display

The widget SHALL implement a module-level queue to manage raid alert events, ensuring alerts are displayed sequentially without overlap.

#### Scenario: Multiple raid events queued

- **WHEN** multiple raid events arrive whilst an alert is already displaying
- **THEN** the widget SHALL queue subsequent alerts and display them sequentially after the current alert completes

### Requirement: Display raider information

The widget SHALL display the raider's username and the number of incoming viewers for each raid alert.

#### Scenario: Raid alert shows raider details

- **WHEN** a channel.raid event is received
- **THEN** the widget SHALL display the raider's username and the incoming viewer count

### Requirement: Auto-dismiss after 4 seconds

Each raid alert SHALL automatically dismiss after 4 seconds of display time.

#### Scenario: Alert auto-dismisses

- **WHEN** a raid alert has been displayed for 4 seconds
- **THEN** the widget SHALL automatically remove the alert from view

### Requirement: Visual animation on appearance

The widget SHALL display a visual animation when a raid alert appears.

#### Scenario: Alert animates on display

- **WHEN** a raid alert begins displaying
- **THEN** the widget SHALL animate the alert's appearance

### Requirement: Event bus subscription

The widget SHALL subscribe to raid events via the event bus and push alerts to the queue when events are received.

#### Scenario: Event bus raid event triggers alert

- **WHEN** a channel.raid event is published to the event bus
- **THEN** the widget SHALL push the raid alert to the display queue

### Requirement: Singleton widget instance

The widget SHALL enforce a singleton pattern, allowing only one instance to exist in the overlay.

#### Scenario: Only one raid alert widget allowed

- **WHEN** attempting to add a second raid alert widget to the overlay
- **THEN** the system SHALL prevent the addition and maintain only a single instance
