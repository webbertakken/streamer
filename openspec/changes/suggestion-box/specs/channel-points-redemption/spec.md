## ADDED Requirements

### Requirement: OAuth scope for channel point redemptions

The Rust auth module SHALL include `channel:read:redemptions` in the OAuth SCOPES constant.

#### Scenario: Auth request includes redemption scope

- **WHEN** the app initiates the device code auth flow
- **THEN** the requested scopes include `channel:read:redemptions`

### Requirement: EventSub subscription for redemptions

The EventSub module SHALL subscribe to `channel.channel_points_custom_reward_redemption.add` (version `1`) with the broadcaster's user ID as the condition.

#### Scenario: EventSub connects and subscribes

- **WHEN** EventSub establishes a session with a welcome message
- **THEN** the system subscribes to `channel.channel_points_custom_reward_redemption.add` alongside existing subscriptions

### Requirement: Event type mapping for redemptions

The EventSub module SHALL map the Twitch event type `channel.channel_points_custom_reward_redemption.add` to the channel event type `channel_points_redemption`.

#### Scenario: Redemption notification received

- **WHEN** EventSub receives a notification with type `channel.channel_points_custom_reward_redemption.add`
- **THEN** the system publishes a `channel_points_redemption` event on the event bus with the event payload data

### Requirement: Event bus type for redemptions

The event bus SHALL include `channel_points_redemption` in the `ChannelEventType` union type.

#### Scenario: Channel points redemption event published

- **WHEN** a `channel_points_redemption` event is published on the bus
- **THEN** all subscribers to the event bus receive the event with type `channel_points_redemption` and the redemption data (user_input, user_name, user_id, reward object)
