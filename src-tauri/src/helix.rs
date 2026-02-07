use crate::auth::{get_valid_token, AuthState};
use serde::Deserialize;
use std::sync::Arc;

const CLIENT_ID: &str = "yu2txwsc619qgqaghrv1xzf66swhad";

/// Generic authenticated GET to a Helix endpoint.
/// Returns the raw JSON response body as a string.
#[tauri::command]
pub async fn helix_get(
    path: String,
    state: tauri::State<'_, Arc<AuthState>>,
) -> Result<String, String> {
    let url = if path.starts_with("https://") {
        path.clone()
    } else {
        format!("https://api.twitch.tv/helix{path}")
    };

    // First attempt
    let data = get_valid_token(&state).await?;
    let resp = state
        .inner()
        .http()
        .get(&url)
        .header("Client-Id", CLIENT_ID)
        .header("Authorization", format!("Bearer {}", data.access_token))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if resp.status().as_u16() == 401 {
        // Token might have just expired — refresh and retry once
        let data = get_valid_token(&state).await?;
        let resp = state
            .inner()
            .http()
            .get(&url)
            .header("Client-Id", CLIENT_ID)
            .header("Authorization", format!("Bearer {}", data.access_token))
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Helix GET failed: {body}"));
        }

        resp.text().await.map_err(|e| e.to_string())
    } else if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        Err(format!("Helix GET failed: {body}"))
    } else {
        resp.text().await.map_err(|e| e.to_string())
    }
}

#[derive(Deserialize)]
pub struct EventSubSubscribeRequest {
    pub session_id: String,
    pub event_type: String,
    pub version: String,
    pub condition: serde_json::Value,
}

/// Create an EventSub subscription via Helix.
#[tauri::command]
pub async fn eventsub_subscribe(
    request: EventSubSubscribeRequest,
    state: tauri::State<'_, Arc<AuthState>>,
) -> Result<String, String> {
    let data = get_valid_token(&state).await?;

    let body = serde_json::json!({
        "type": request.event_type,
        "version": request.version,
        "condition": request.condition,
        "transport": {
            "method": "websocket",
            "session_id": request.session_id,
        }
    });

    let resp = state
        .inner()
        .http()
        .post("https://api.twitch.tv/helix/eventsub/subscriptions")
        .header("Client-Id", CLIENT_ID)
        .header("Authorization", format!("Bearer {}", data.access_token))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let resp_body = resp.text().await.unwrap_or_default();
        return Err(format!("EventSub subscribe failed: {resp_body}"));
    }

    resp.text().await.map_err(|e| e.to_string())
}
