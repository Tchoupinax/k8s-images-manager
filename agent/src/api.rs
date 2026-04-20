use crate::commands;
use log::{error, info};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::error::Error;

#[derive(Debug, Serialize, Deserialize)]
pub struct ImageInfo {
    pub repository: String,
    pub tag: String,
    pub digest: String,
    pub size: String,
    pub date: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeletionCommand {
    pub repository: String,
    pub tag: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ServerResponse {
    pub ok: bool,
    #[serde(default)]
    pub deletions: Vec<DeletionCommand>,
}

pub async fn send_to_server(
    images: Vec<ImageInfo>,
    hostname: String,
    base_url: String,
) -> Result<(), Box<dyn Error>> {
    let server_url = format!("{base_url}/api/register");

    let client = Client::new();
    let response = match client
        .post(server_url)
        .header("hostname", hostname)
        .json(&images)
        .send()
        .await
    {
        Ok(response) => response,
        Err(e) => {
            error!("Failed to send data to server: {}", e);
            return Ok(());
        }
    };

    if response.status().is_success() {
        info!("Data sent successfully");

        let body = match response.json::<ServerResponse>().await {
            Ok(body) => body,
            Err(e) => {
                error!("Server response could not be parsed: {}", e);
                return Ok(());
            }
        };
        info!(
            "Received {} image deletion command(s) from server",
            body.deletions.len()
        );
        for deletion in &body.deletions {
            info!(
                "Deletion requested for image {}:{}",
                deletion.repository, deletion.tag
            );
        }
        
        for deletion in body.deletions {
            if let Err(e) =
                commands::execute_remove_image_command(&deletion.repository, &deletion.tag)
            {
                error!(
                    "Error while trying to remove image {}:{} - {}",
                    deletion.repository, deletion.tag, e
                );
            }
        }
    } else {
        error!("Failed to send data: {}", response.status());
    }

    Ok(())
}
