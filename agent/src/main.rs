mod api;
mod commands;
mod logger;
use gethostname::gethostname;
use log::{error, info};
use std::env;
use std::time::Duration;
use tokio::time;

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

                let images: Vec<api::ImageInfo> = commands::parse_images(&output);
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
