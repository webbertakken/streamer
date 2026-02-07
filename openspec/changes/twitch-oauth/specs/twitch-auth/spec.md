## ADDED Requirements

### Requirement: OAuth PKCE login flow

The system SHALL provide a Twitch OAuth login using the PKCE authorisation code flow. The streamer MUST be able to initiate login from the settings panel. The system SHALL open the default browser for the Twitch consent screen and capture the callback via a temporary localhost server.

#### Scenario: Successful login

- **WHEN** the streamer clicks "Log in with Twitch" in the settings panel
- **THEN** the system opens the default browser to the Twitch authorisation URL with a PKCE code challenge
- **AND** after the streamer grants consent, the temporary localhost server captures the authorisation code
- **AND** the Rust backend exchanges the code for an access token and refresh token
- **AND** the settings panel displays the authenticated username and a "Log out" button

#### Scenario: Login cancelled

- **WHEN** the streamer closes the browser tab or denies consent
- **THEN** the system remains unauthenticated
- **AND** the settings panel continues to show the "Log in with Twitch" button

#### Scenario: Login with existing valid token

- **WHEN** the app starts and a valid token exists in the OS credential store
- **THEN** the system SHALL restore the authenticated session without requiring browser interaction
- **AND** the settings panel displays the authenticated username

### Requirement: Secure token storage

The system SHALL store OAuth tokens (access token, refresh token, expiry) in the OS credential manager via `tauri-plugin-keyring`. Tokens MUST NOT be stored in localStorage, cookies, or unencrypted files. Tokens MUST NOT be exposed to the webview.

#### Scenario: Tokens persisted across restarts

- **WHEN** the streamer logs in and restarts the application
- **THEN** the stored tokens are retrieved from the OS credential manager
- **AND** the session is restored without re-authentication

#### Scenario: Token not accessible from frontend

- **WHEN** any frontend code attempts to read the raw token value
- **THEN** no Tauri command SHALL return the raw token to the webview (except the IRC token command, which returns only the access token string)

### Requirement: Token refresh

The system SHALL automatically refresh the access token before it expires. If a Helix API call returns 401, the system SHALL attempt one token refresh and retry.

#### Scenario: Automatic refresh before expiry

- **WHEN** a Helix API call is made and the access token expires within 5 minutes
- **THEN** the Rust backend refreshes the token using the refresh token
- **AND** stores the new tokens in the credential manager
- **AND** the API call proceeds with the new token

#### Scenario: Refresh token expired

- **WHEN** the refresh token is invalid or revoked
- **THEN** the system clears stored tokens
- **AND** the settings panel shows the "Log in with Twitch" button
- **AND** a notification informs the streamer that re-authentication is needed

### Requirement: Logout and token revocation

The system SHALL allow the streamer to log out, which revokes the token with Twitch and clears it from the credential store.

#### Scenario: Successful logout

- **WHEN** the streamer clicks "Log out" in the settings panel
- **THEN** the system revokes the access token with the Twitch API
- **AND** clears all tokens from the OS credential manager
- **AND** disconnects authenticated IRC and EventSub
- **AND** the settings panel shows the "Log in with Twitch" button

### Requirement: Scopes requested at login

The system SHALL request the following fixed scopes: `chat:read`, `chat:edit`, `moderator:read:followers`, `user:read:chat`, `channel:read:subscriptions`, `bits:read`.

#### Scenario: All scopes granted

- **WHEN** the streamer completes the OAuth flow
- **THEN** the returned token includes all requested scopes
- **AND** all authenticated features are available

### Requirement: Client ID bundled, no client secret

The application SHALL bundle only the Twitch client ID. The client secret MUST NOT be included in the binary. The PKCE flow eliminates the need for a client secret.

#### Scenario: Binary does not contain client secret

- **WHEN** the application binary is inspected
- **THEN** no client secret value is present
- **AND** the OAuth flow uses PKCE code challenge instead
