use log::{error, info, warn};
use serde::Deserialize;
use std::io::Write;
use std::process::{Command, Stdio};

use crate::api::ImageInfo;

const FAKE_ANSWER: &str = r#"{"images":[{"id":"aa5e3ebc0dfed","repoTags":["this_is_a_fake_image:1.13.1"],"size":"23600000"}]}"#;

#[derive(Debug, Deserialize)]
struct CrictlImages {
    #[serde(default)]
    images: Vec<CrictlImage>,
}

#[derive(Debug, Deserialize)]
struct CrictlImage {
    #[serde(default)]
    id: String,
    #[serde(default, rename = "repoTags")]
    repo_tags: Vec<String>,
    #[serde(default)]
    size: serde_json::Value,
}

pub fn execute_list_image_command() -> Result<String, std::io::Error> {
    match Command::new("sudo")
        .arg("--non-interactive")
        .arg("/usr/local/bin/crictl-images")
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

pub fn parse_images(output: &str) -> Vec<ImageInfo> {
    let parsed: CrictlImages = match serde_json::from_str(output) {
        Ok(parsed) => parsed,
        Err(e) => {
            error!("Failed to parse crictl images JSON: {}", e);
            return Vec::new();
        }
    };

    let now = chrono::Utc::now().to_rfc3339();
    let mut images = Vec::new();

    for image in parsed.images {
        let size = format_size(json_size_to_bytes(&image.size));
        let tags = if image.repo_tags.is_empty() {
            vec!["<none>:<none>".to_string()]
        } else {
            image.repo_tags
        };

        for repo_tag in tags {
            let (repository, tag) = split_repo_tag(&repo_tag);
            images.push(ImageInfo {
                repository,
                tag,
                digest: image.id.clone(),
                size: size.clone(),
                date: now.clone(),
            });
        }
    }

    images
}

pub fn execute_remove_image_command(repository: &str, tag: &str) -> Result<(), std::io::Error> {
    let image_ref = format!("{repository}:{tag}");
    let images = parse_images(&execute_list_image_command()?);
    let Some(image) = images
        .iter()
        .find(|img| img.repository == repository && img.tag == tag)
    else {
        warn!("Image {} is not present on this node, skipping", image_ref);
        return Ok(());
    };

    let output = Command::new("sudo")
        .arg("--non-interactive")
        .arg("/usr/local/bin/crictl-rmi")
        .arg(&image.digest)
        .output()?;

    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);

    if output.status.success() {
        info!("Successfully requested removal of image {} ({})", image_ref, image.digest);
    } else {
        error!(
            "Failed to remove image {} ({}) status={}: {} {}",
            image_ref,
            image.digest,
            output.status,
            stdout.trim(),
            stderr.trim()
        );
    }

    Ok(())
}

pub fn execute_pull_image_command(repository: &str, tag: &str) -> Result<(), std::io::Error> {
    let image_ref = format!("{repository}:{tag}");
    let images = parse_images(&execute_list_image_command()?);
    if images
        .iter()
        .any(|img| img.repository == repository && img.tag == tag)
    {
        info!("Image {} already present on this node, skipping pull", image_ref);
        return Ok(());
    }

    let mut child = Command::new("sudo")
        .arg("--non-interactive")
        .arg("/usr/local/bin/crictl-pull")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(image_ref.as_bytes())?;
        stdin.write_all(b"\n")?;
    }

    let output = child.wait_with_output()?;
    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);

    if output.status.success() {
        info!("Successfully pulled image {}", image_ref);
        Ok(())
    } else {
        error!(
            "Failed to pull image {} status={}: {} {}",
            image_ref,
            output.status,
            stdout.trim(),
            stderr.trim()
        );
        Err(std::io::Error::other(format!(
            "Failed to pull image {image_ref}"
        )))
    }
}

fn split_repo_tag(repo_tag: &str) -> (String, String) {
    let name_start = repo_tag.rfind('/').map(|i| i + 1).unwrap_or(0);
    match repo_tag[name_start..].rfind(':') {
        Some(relative_colon) => {
            let split_at = name_start + relative_colon;
            (
                repo_tag[..split_at].to_string(),
                repo_tag[split_at + 1..].to_string(),
            )
        }
        None => (repo_tag.to_string(), "latest".to_string()),
    }
}

fn json_size_to_bytes(value: &serde_json::Value) -> u64 {
    match value {
        serde_json::Value::Number(n) => n.as_u64().unwrap_or(0),
        serde_json::Value::String(s) => s.parse().unwrap_or(0),
        _ => 0,
    }
}

fn format_size(bytes: u64) -> String {
    const UNITS: [&str; 5] = ["B", "KB", "MB", "GB", "TB"];
    if bytes == 0 {
        return "0B".to_string();
    }

    let mut size = bytes as f64;
    let mut unit = 0;
    while size >= 1024.0 && unit < UNITS.len() - 1 {
        size /= 1024.0;
        unit += 1;
    }

    if unit == 0 {
        format!("{}{}", bytes, UNITS[unit])
    } else {
        format!("{:.1}{}", size, UNITS[unit])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_images_expands_repo_tags_and_formats_size() {
        let json = r#"{"images":[{"id":"sha256:abc","repoTags":["docker.io/library/nginx:1.27","registry.example:5000/app:v2"],"size":1048576}]}"#;
        let images = parse_images(json);

        assert_eq!(images.len(), 2);
        assert_eq!(images[0].repository, "docker.io/library/nginx");
        assert_eq!(images[0].tag, "1.27");
        assert_eq!(images[0].digest, "sha256:abc");
        assert_eq!(images[0].size, "1.0MB");
        assert_eq!(images[1].repository, "registry.example:5000/app");
        assert_eq!(images[1].tag, "v2");
    }

    #[test]
    fn parse_images_defaults_tag_to_latest_without_colon() {
        let json = r#"{"images":[{"id":"sha256:id","repoTags":["docker.io/busybox"],"size":100}]}"#;
        let images = parse_images(json);

        assert_eq!(images.len(), 1);
        assert_eq!(images[0].repository, "docker.io/busybox");
        assert_eq!(images[0].tag, "latest");
        assert_eq!(images[0].size, "100B");
    }

    #[test]
    fn parse_images_uses_none_placeholder_when_repo_tags_empty() {
        let json = r#"{"images":[{"id":"sha256:id","repoTags":[],"size":0}]}"#;
        let images = parse_images(json);

        assert_eq!(images.len(), 1);
        assert_eq!(images[0].repository, "<none>");
        assert_eq!(images[0].tag, "<none>");
        assert_eq!(images[0].size, "0B");
    }

    #[test]
    fn parse_images_accepts_string_sizes() {
        let json = r#"{"images":[{"id":"sha256:a","repoTags":["x:1"],"size":"2048"}]}"#;
        let images = parse_images(json);

        assert_eq!(images[0].size, "2.0KB");
    }

    #[test]
    fn parse_images_returns_empty_on_invalid_json() {
        assert!(parse_images("not-json").is_empty());
    }
}
