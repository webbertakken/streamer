use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{error, info, warn};

const CLIENT_ID: &str = "yu2txwsc619qgqaghrv1xzf66swhad";
const SCOPES: &str =
    "chat:read chat:edit moderator:read:followers user:read:chat channel:read:subscriptions bits:read channel:manage:broadcast channel:read:redemptions";

/// Stored token data, serialised as JSON on disk.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenData {
    pub access_token: String,
    pub refresh_token: String,
    /// Unix timestamp (seconds) when the access token expires.
    pub expires_at: i64,
    pub username: String,
}

/// Shared auth state managed by Tauri.
pub struct AuthState {
    http: Client,
    /// Guards concurrent token refreshes.
    refresh_lock: Mutex<()>,
    /// Path to the tokens file in the app data directory.
    tokens_path: PathBuf,
}

impl AuthState {
    pub fn new(data_dir: PathBuf) -> Self {
        Self {
            http: Client::new(),
            refresh_lock: Mutex::new(()),
            tokens_path: data_dir.join("tokens.json"),
        }
    }

    pub fn http(&self) -> &Client {
        &self.http
    }
}

// ---------------------------------------------------------------------------
// File-based token storage
// ---------------------------------------------------------------------------

fn load_tokens(path: &PathBuf) -> Result<Option<TokenData>, String> {
    match std::fs::read_to_string(path) {
        Ok(json) => {
            info!("[auth] loaded tokens from {}", path.display());
            let data: TokenData = serde_json::from_str(&json).map_err(|e| e.to_string())?;
            Ok(Some(data))
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            info!("[auth] no tokens file at {}", path.display());
            Ok(None)
        }
        Err(e) => {
            error!("[auth] token file read error: {e}");
            Err(e.to_string())
        }
    }
}

fn store_tokens(path: &PathBuf, data: &TokenData) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
    std::fs::write(path, &json).map_err(|e| {
        error!("[auth] token file write error: {e}");
        e.to_string()
    })?;
    info!("[auth] tokens saved to {}", path.display());
    Ok(())
}

fn clear_tokens(path: &PathBuf) -> Result<(), String> {
    match std::fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

// ---------------------------------------------------------------------------
// Device Code Grant Flow
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
struct TwitchDeviceResponse {
    device_code: String,
    expires_in: u64,
    interval: u64,
    user_code: String,
    verification_uri: String,
}

#[derive(Deserialize)]
struct TwitchTokenResponse {
    access_token: String,
    refresh_token: String,
    expires_in: i64,
}

#[derive(Deserialize)]
struct TwitchValidateResponse {
    login: String,
}

#[derive(Deserialize)]
struct TwitchErrorResponse {
    message: String,
}

async fn validate_token(http: &Client, access_token: &str) -> Result<String, String> {
    let resp = http
        .get("https://id.twitch.tv/oauth2/validate")
        .header("Authorization", format!("OAuth {access_token}"))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err("Token validation failed".into());
    }

    let data: TwitchValidateResponse = resp.json().await.map_err(|e| e.to_string())?;
    Ok(data.login)
}

async fn refresh_tokens(http: &Client, refresh_token: &str) -> Result<TokenData, String> {
    info!("[auth] refreshing tokens…");
    let resp = http
        .post("https://id.twitch.tv/oauth2/token")
        .form(&[
            ("client_id", CLIENT_ID),
            ("refresh_token", refresh_token),
            ("grant_type", "refresh_token"),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        warn!("[auth] refresh failed: {body}");
        return Err(format!("Token refresh failed: {body}"));
    }

    let tokens: TwitchTokenResponse = resp.json().await.map_err(|e| e.to_string())?;
    let username = validate_token(http, &tokens.access_token).await?;
    info!("[auth] refresh success — user={username}");
    let now = chrono::Utc::now().timestamp();

    Ok(TokenData {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: now + tokens.expires_in,
        username,
    })
}

// ---------------------------------------------------------------------------
// Public: get a valid access token (refresh if needed)
// ---------------------------------------------------------------------------

pub async fn get_valid_token(state: &AuthState) -> Result<TokenData, String> {
    let _guard = state.refresh_lock.lock().await;

    let data = load_tokens(&state.tokens_path)?.ok_or("Not authenticated")?;
    let now = chrono::Utc::now().timestamp();

    // Refresh if expiring within 5 minutes
    if now >= data.expires_at - 300 {
        let refreshed = refresh_tokens(&state.http, &data.refresh_token).await?;
        store_tokens(&state.tokens_path, &refreshed)?;
        Ok(refreshed)
    } else {
        Ok(data)
    }
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

/// Response from the device code initiation step.
#[derive(Serialize, Clone)]
pub struct DeviceCodeInfo {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}

/// Step 1: request a device code from Twitch.
#[tauri::command]
pub async fn auth_device_start(
    state: tauri::State<'_, Arc<AuthState>>,
) -> Result<DeviceCodeInfo, String> {
    info!("[auth] requesting device code…");
    let resp = state
        .http
        .post("https://id.twitch.tv/oauth2/device")
        .form(&[("client_id", CLIENT_ID), ("scopes", SCOPES)])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        warn!("[auth] device code request failed: {body}");
        return Err(format!("Device code request failed: {body}"));
    }

    let data: TwitchDeviceResponse = resp.json().await.map_err(|e| e.to_string())?;
    info!(
        "[auth] device code ready — user_code={} uri={}",
        data.user_code, data.verification_uri
    );

    Ok(DeviceCodeInfo {
        device_code: data.device_code,
        user_code: data.user_code,
        verification_uri: data.verification_uri,
        expires_in: data.expires_in,
        interval: data.interval,
    })
}

/// Step 2: poll until the user authorises (or the code expires).
#[tauri::command]
pub async fn auth_device_poll(
    device_code: String,
    interval: u64,
    expires_in: u64,
    state: tauri::State<'_, Arc<AuthState>>,
) -> Result<AuthStatusResponse, String> {
    let deadline = tokio::time::Instant::now() + tokio::time::Duration::from_secs(expires_in);
    let poll_interval = tokio::time::Duration::from_secs(interval.max(5));

    loop {
        tokio::time::sleep(poll_interval).await;

        if tokio::time::Instant::now() >= deadline {
            warn!("[auth] device code expired");
            return Err("Device code expired — please try again".into());
        }

        let resp = state
            .http
            .post("https://id.twitch.tv/oauth2/token")
            .form(&[
                ("client_id", CLIENT_ID),
                ("scopes", SCOPES),
                ("device_code", device_code.as_str()),
                ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
            ])
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if resp.status().is_success() {
            let tokens: TwitchTokenResponse = resp.json().await.map_err(|e| e.to_string())?;
            info!("[auth] device flow got tokens, validating…");
            let username = validate_token(&state.http, &tokens.access_token).await?;
            let now = chrono::Utc::now().timestamp();

            let data = TokenData {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_at: now + tokens.expires_in,
                username: username.clone(),
            };
            store_tokens(&state.tokens_path, &data)?;
            info!("[auth] device flow complete — user={username}");

            return Ok(AuthStatusResponse {
                authenticated: true,
                username: Some(username),
            });
        }

        // Check the error — keep polling on "authorization_pending"
        let body = resp.text().await.unwrap_or_default();
        if let Ok(err) = serde_json::from_str::<TwitchErrorResponse>(&body) {
            if err.message == "authorization_pending" {
                continue;
            }
            warn!("[auth] device poll error: {}", err.message);
            return Err(format!("Device auth failed: {}", err.message));
        }
        warn!("[auth] device poll unexpected response: {body}");
        return Err(format!("Device auth failed: {body}"));
    }
}

#[derive(Serialize, Clone)]
pub struct AuthStatusResponse {
    pub authenticated: bool,
    pub username: Option<String>,
}

#[tauri::command]
pub async fn auth_status(
    state: tauri::State<'_, Arc<AuthState>>,
) -> Result<AuthStatusResponse, String> {
    info!("[auth] checking stored session…");
    match get_valid_token(&state).await {
        Ok(data) => {
            info!("[auth] stored session valid — user={}", data.username);
            Ok(AuthStatusResponse {
                authenticated: true,
                username: Some(data.username),
            })
        }
        Err(e) => {
            info!("[auth] no stored session: {e}");
            Ok(AuthStatusResponse {
                authenticated: false,
                username: None,
            })
        }
    }
}

#[tauri::command]
pub async fn auth_logout(state: tauri::State<'_, Arc<AuthState>>) -> Result<(), String> {
    info!("[auth] logging out…");
    if let Ok(Some(data)) = load_tokens(&state.tokens_path) {
        let _ = state
            .http
            .post("https://id.twitch.tv/oauth2/revoke")
            .form(&[("client_id", CLIENT_ID), ("token", &data.access_token)])
            .send()
            .await;
    }
    clear_tokens(&state.tokens_path)
}

#[tauri::command]
pub async fn auth_get_irc_token(
    state: tauri::State<'_, Arc<AuthState>>,
) -> Result<IrcTokenResponse, String> {
    let data = get_valid_token(&state).await?;
    Ok(IrcTokenResponse {
        token: data.access_token,
        username: data.username,
    })
}

#[derive(Serialize, Clone)]
pub struct IrcTokenResponse {
    pub token: String,
    pub username: String,
}
