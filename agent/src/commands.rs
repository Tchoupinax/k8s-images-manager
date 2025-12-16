use std::process::Command;

const FAKE_ANSWER: &str = r#"
IMAGE                                                                    TAG                                        IMAGE ID            SIZE
this_is_a_fake_image                                                1.13.1                                     aa5e3ebc0dfed       23.6MB
"#;

pub fn execute_list_image_command() -> Result<String, std::io::Error> {
    match Command::new("crictl")
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
