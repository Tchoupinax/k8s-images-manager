use log::{error, info};
use std::process::Command;

const FAKE_ANSWER: &str = r#"
IMAGE                                                                    TAG                                        IMAGE ID            SIZE
this_is_a_fake_image                                                1.13.1                                     aa5e3ebc0dfed       23.6MB
"#;

pub fn execute_list_image_command() -> Result<String, std::io::Error> {
    match Command::new("sudo")
        .arg("--non-interactive")
        .arg("/usr/local/bin/crictl")
        .arg("--runtime-endpoint")
        .arg("unix:///run/k3s/containerd/containerd.sock")
        .arg("images")
        .output()
    {
        Ok(output) => {
            if !output.status.success() {
                return Ok(FAKE_ANSWER.to_string());
            }

            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        }
        Err(_) => Ok(FAKE_ANSWER.to_string()),
    }
}

pub fn execute_remove_image_command(repository: &str, tag: &str) -> Result<(), std::io::Error> {
    let image_ref = format!("{repository}:{tag}");

    match Command::new("sudo")
        .arg("--non-interactive")
        .arg("/usr/local/bin/crictl")
        .arg("--runtime-endpoint")
        .arg("unix:///run/k3s/containerd/containerd.sock")
        .arg("rmi")
        .arg(&image_ref)
        .status()
    {
        Ok(status) => {
            if status.success() {
                info!("Successfully requested removal of image {}", image_ref);
            } else {
                error!(
                    "Failed to remove image {}. Exit status: {}",
                    image_ref, status
                );
            }
        }
        Err(e) => {
            error!("Error executing crictl rmi for {}: {}", image_ref, e);
        }
    }

    Ok(())
}
