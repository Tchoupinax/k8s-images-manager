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

pub async fn send_to_server(
    images: Vec<ImageInfo>,
    hostname: String,
    base_url: String,
) -> Result<(), Box<dyn Error>> {
    let server_url = format!("{base_url}/api/register");

    let client = Client::new();
    let response = client
        .post(server_url)
        .header("hostname", hostname)
        .json(&images)
        .send()
        .await?;

    if response.status().is_success() {
        info!("Data sent successfully");
    } else {
        error!("Failed to send data: {}", response.status());
    }

    Ok(())
}
