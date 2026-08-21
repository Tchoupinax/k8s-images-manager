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
pub struct ImageCommand {
    pub repository: String,
    pub tag: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ServerResponse {
    pub ok: bool,
    #[serde(default)]
    pub deletions: Vec<ImageCommand>,
    #[serde(default)]
    pub pulls: Vec<ImageCommand>,
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
        .header("hostname", hostname.as_str())
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
            "Received {} image deletion command(s) and {} pull command(s) from server",
            body.deletions.len(),
            body.pulls.len()
        );

        for deletion in body.deletions {
            info!(
                "Deletion requested for image {}:{}",
                deletion.repository, deletion.tag
            );
            if let Err(e) =
                commands::execute_remove_image_command(&deletion.repository, &deletion.tag)
            {
                error!(
                    "Error while trying to remove image {}:{} - {}",
                    deletion.repository, deletion.tag, e
                );
            }
        }

        let mut acked_pulls: Vec<ImageCommand> = Vec::new();
        for pull in body.pulls {
            info!(
                "Pull requested for image {}:{}",
                pull.repository, pull.tag
            );
            match commands::execute_pull_image_command(&pull.repository, &pull.tag) {
                Ok(()) => acked_pulls.push(pull),
                Err(e) => {
                    error!(
                        "Error while trying to pull image {}:{} - {}",
                        pull.repository, pull.tag, e
                    );
                }
            }
        }

        if !acked_pulls.is_empty() {
            ack_pulls(&client, &hostname, &base_url, &acked_pulls).await;
        }
    } else {
        error!("Failed to send data: {}", response.status());
    }

    Ok(())
}

async fn ack_pulls(
    client: &Client,
    hostname: &str,
    base_url: &str,
    pulls: &[ImageCommand],
) {
    let server_url = format!("{base_url}/api/images/pull/ack");
    match client
        .post(server_url)
        .header("hostname", hostname)
        .json(pulls)
        .send()
        .await
    {
        Ok(response) if response.status().is_success() => {
            info!(
                "Acknowledged {} pull command(s) to server",
                pulls.len()
            );
        }
        Ok(response) => {
            error!("Failed to acknowledge pulls: {}", response.status());
        }
        Err(e) => {
            error!("Failed to acknowledge pulls: {}", e);
        }
    }
}
