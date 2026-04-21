mod api;
mod commands;
mod logger;
use chrono::{DateTime, Utc};
use gethostname::gethostname;
use log::{error, info};
use std::env;
use std::time::{Duration, SystemTime};
use tokio::time;

fn parse_images(output: &str) -> Vec<api::ImageInfo> {
    let mut images = Vec::new();

    for line in output.lines() {
        if line.trim().is_empty() {
            continue;
        }

        if line.contains("REF") || line.contains("IMAGE") {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        let now: SystemTime = SystemTime::now();
        let now: DateTime<Utc> = now.into();
        let now = now.to_rfc3339();

        if parts.len() >= 5 {
            let image_info = api::ImageInfo {
                repository: parts[0].to_string(),
                tag: parts[1].to_string(),
                digest: parts[2].to_string(),
                size: parts[4].to_string(),
                date: now,
            };
            images.push(image_info);
        } else {
            let image_info = api::ImageInfo {
                repository: parts[0].to_string(),
                tag: parts[1].to_string(),
                digest: parts[2].to_string(),
                size: parts[3].to_string(),
                date: now,
            };
            images.push(image_info);
        }
    }

    images
}

#[tokio::main]
async fn main() {
    logger::init_logger();

    let server_url = match env::var("SERVER_URL") {
        Ok(value) => value,
        Err(_) => {
            eprintln!("SERVER_URL is mandatory");
            std::process::exit(1)
        }
    };

    let name = match env::var("NODE_NAME") {
        Ok(value) => value,
        Err(_) => match gethostname().into_string() {
            Ok(hostname) => hostname,
            Err(_) => "_".to_string(),
        },
    };

    let push_frequency_second = match env::var("PUSH_FREQUENCY_IN_SECOND") {
        Ok(value) => value.parse().unwrap_or(30),
        Err(_) => 30,
    };

    let interval = Duration::from_secs(push_frequency_second);
    let mut ticker = time::interval(interval);

    loop {
        tokio::select! {
            _ = shutdown_signal() => {
                info!("Shutdown signal received, stopping agent");
                break;
            }
            _ = ticker.tick() => {
                let output = match commands::execute_list_image_command() {
                    Ok(output) => output,
                    Err(e) => {
                        error!("Unexpected error while listing images: {}", e);
                        continue;
                    }
                };

                let images: Vec<api::ImageInfo> = parse_images(&output);
                info!("{} images detected", images.len());

                if let Err(e) = api::send_to_server(images, name.clone(), server_url.clone()).await {
                    error!("Unexpected error while processing server communication: {}", e);
                }
            }
        }
    }
}

async fn shutdown_signal() {
    #[cfg(unix)]
    {
        use tokio::signal::unix::{signal, SignalKind};

        let mut terminate = signal(SignalKind::terminate()).expect("failed to install SIGTERM handler");
        tokio::select! {
            _ = tokio::signal::ctrl_c() => {}
            _ = terminate.recv() => {}
        }
    }

    #[cfg(not(unix))]
    {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    }
}
