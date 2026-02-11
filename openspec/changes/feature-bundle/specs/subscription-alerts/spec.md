# Subscription alerts specification

## ADDED Requirements

### Requirement: Queue-based subscription alert display

The widget SHALL implement a module-level queue to manage subscription alert events, ensuring alerts are displayed sequentially without overlap.

#### Scenario: Multiple subscription events queued

- **WHEN** multiple subscription events arrive whilst an alert is already displaying
- **THEN** the widget SHALL queue subsequent alerts and display them sequentially after the current alert completes

### Requirement: Handle multiple subscription event types

The widget SHALL handle three subscription event types: new subscriptions (channel.subscribe), gift subscriptions (channel.subscription.gift), and resubscription messages (channel.subscription.message).

#### Scenario: New subscription alert

- **WHEN** a channel.subscribe event is received
- **THEN** the widget SHALL display an alert showing the subscriber's username and tier

#### Scenario: Gift subscription alert

- **WHEN** a channel.subscription.gift event is received
- **THEN** the widget SHALL display an alert showing the gifter's username, recipient's username (if available), and tier

#### Scenario: Resubscription message alert

- **WHEN** a channel.subscription.message event is received
- **THEN** the widget SHALL display an alert showing the subscriber's username, tier, and resubscription message

### Requirement: Display subscription tier

The widget SHALL display the subscription tier (1, 2, or 3) for all subscription alerts.

#### Scenario: Tier information shown

- **WHEN** a subscription event is received
- **THEN** the widget SHALL display the tier value (1, 2, or 3) in the alert

### Requirement: Display gifter information

The widget SHALL display the gifter's username when showing gift subscription alerts.

#### Scenario: Gift subscription shows gifter

- **WHEN** a channel.subscription.gift event is received
- **THEN** the widget SHALL display the gifter's username in the alert

### Requirement: Display resubscription message

The widget SHALL display the resubscription message content when present in subscription message events.

#### Scenario: Resub message shown when present

- **WHEN** a channel.subscription.message event contains a message
- **THEN** the widget SHALL display the message content in the alert

#### Scenario: Resub alert without message

- **WHEN** a channel.subscription.message event has no message content
- **THEN** the widget SHALL display the alert without showing a message section

### Requirement: Auto-dismiss after 4 seconds

Each subscription alert SHALL automatically dismiss after 4 seconds of display time.

#### Scenario: Alert auto-dismisses

- **WHEN** a subscription alert has been displayed for 4 seconds
- **THEN** the widget SHALL automatically remove the alert from view

### Requirement: Singleton widget instance

The widget SHALL enforce a singleton pattern, allowing only one instance to exist in the overlay.

#### Scenario: Only one subscription alert widget allowed

- **WHEN** attempting to add a second subscription alert widget to the overlay
- **THEN** the system SHALL prevent the addition and maintain only a single instance
