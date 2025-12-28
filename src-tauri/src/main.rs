// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

use base64::{engine::general_purpose, Engine as _};
use oauth2::basic::BasicClient;
use oauth2::{
    AuthorizationCode,
    AuthUrl,
    ClientId,
    ClientSecret,
    CsrfToken,
    PkceCodeChallenge,
    RedirectUrl,
    Scope,
    TokenResponse,
    TokenUrl
};
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use serde_json::json;
use serde_json::Value;
use std::collections::HashMap;
use std::io::Write;
use std::{path::Path, time::Duration};
use std::sync::{Arc, Mutex};
use tauri::path::BaseDirectory;
use tauri::{Listener, Manager};
use tauri::{AppHandle, Emitter};

#[tauri::command]
async fn native_request(url: String, body: String, header: String, method: String) -> String {
    let headers_json: Value = match serde_json::from_str(&header) {
        Ok(h) => h,
        Err(e) => return format!(r#"{{"success":false,"body":"{}"}}"#, e.to_string()),
    };

    let mut headers = HeaderMap::new();
    let method = method.to_string();
    if let Some(obj) = headers_json.as_object() {
        for (key, value) in obj {
            let header_name = match HeaderName::from_bytes(key.as_bytes()) {
                Ok(name) => name,
                Err(e) => return format!(r#"{{"success":false,"body":"{}"}}"#, e.to_string()),
            };
            let header_value = match HeaderValue::from_str(value.as_str().unwrap_or("")) {
                Ok(value) => value,
                Err(e) => return format!(r#"{{"success":false,"body":"{}"}}"#, e.to_string()),
            };
            headers.insert(header_name, header_value);
        }
    } else {
        return format!(r#"{{"success":false,"body":"Invalid header JSON"}}"#);
    }

    let client = reqwest::Client::new();
    let response: Result<reqwest::Response, reqwest::Error>;

    if method == "POST" {
        response = client
            .post(&url)
            .headers(headers)
            .timeout(Duration::from_secs(120))
            .body(body)
            .send()
            .await;
    } else {
        response = client
            .get(&url)
            .headers(headers)
            .timeout(Duration::from_secs(120))
            .send()
            .await;
    }

    match response {
        Ok(resp) => {
            let headers = resp.headers();
            let header_json = header_map_to_json(headers);
            let status = resp.status().as_u16().to_string();
            let bytes = match resp.bytes().await {
                Ok(b) => b,
                Err(e) => return format!(r#"{{"success":false,"body":"{}"}}"#, e.to_string()),
            };
            let encoded = general_purpose::STANDARD.encode(&bytes);

            format!(
                // r#"{{"success":true,"body":"{}","headers":{}}}"#,
                r#"{{"success":true,"body":"{}","headers":{},"status":{}}}"#,
                encoded, header_json, status
            )
        }
        Err(e) => format!(r#"{{"success":false,"body":"{}","status":400}}"#, e.to_string()),
    }
}

use oauth2::{
    EmptyExtraTokenFields, EndpointNotSet, EndpointSet, RevocationErrorResponseType,
    StandardErrorResponse, StandardRevocableToken, StandardTokenIntrospectionResponse,
    StandardTokenResponse,
};

use oauth2::basic::{
    BasicErrorResponseType, BasicTokenType,
};

fn get_oauth_client() -> oauth2::Client<StandardErrorResponse<BasicErrorResponseType>, StandardTokenResponse<EmptyExtraTokenFields, BasicTokenType>, StandardTokenIntrospectionResponse<EmptyExtraTokenFields, BasicTokenType>, StandardRevocableToken, StandardErrorResponse<RevocationErrorResponseType>, EndpointSet, EndpointNotSet, EndpointNotSet, EndpointNotSet, EndpointSet> {
    let auth_url = AuthUrl::new("http://authorize".to_string()).unwrap();
    let token_url = TokenUrl::new("http://token".to_string()).unwrap();
    let redirection_url = RedirectUrl::new("http://redirect".to_string()).unwrap();
    let client = BasicClient::new(ClientId::new("client_id".to_string()))
        .set_client_secret(ClientSecret::new("client_secret".to_string()))
        .set_auth_uri(auth_url)
        .set_token_uri(token_url)
        // Set the URL the user will be redirected to after the authorization process.
        .set_redirect_uri(redirection_url);

    return client;
}


#[tauri::command]
async fn oauth_login(app: AppHandle) -> Result<String, String> {

    let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();
    let client = get_oauth_client();
    // Write pkce_verifier to a file or session for later use.
    std::fs::write("pkce_verifier.txt", pkce_verifier.secret()).unwrap();

    let (auth_url, _csrf_token) = client
        .authorize_url(CsrfToken::new_random)
        // Set the desired scopes.
        .add_scope(Scope::new("read".to_string()))
        .add_scope(Scope::new("write".to_string()))
        // Set the PKCE code challenge.
        .set_pkce_challenge(pkce_challenge)
        .url();

    let http_client = oauth2::reqwest::ClientBuilder::new()
        // Following redirects opens the client up to SSRF vulnerabilities.
        .redirect(oauth2::reqwest::redirect::Policy::none())
        .build()
        .expect("Client should build");

    app.emit("oauth_open_url",auth_url.to_string()).unwrap();

    let auth_code = Arc::new(Mutex::new(String::new()));
    let auth_code_clone = Arc::clone(&auth_code);

    let handle = app.app_handle().clone();
    //promise
    app.listen("oauth_callback_event", move |event| {
        // Handle the event
        let mut code = auth_code_clone.lock().unwrap();
        *code = event.payload().to_string();
        handle.unlisten(event.id());
    });

    //wait for auth_code to be set
    loop {
        {
            let code = auth_code.lock().unwrap();
            if !code.is_empty() {
                break;
            }
        } // MutexGuard is dropped here before await
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    }

    // Now you can trade it for an access token.
    let auth_code_value = auth_code.lock().unwrap().clone();
    let token_result = client
        .exchange_code(AuthorizationCode::new(auth_code_value))
        // Set the PKCE code verifier.
        .set_pkce_verifier(pkce_verifier)
        .request_async(&http_client)
        .await;


    return Ok(token_result.unwrap().access_token().secret().to_string());
}


#[tauri::command]
fn check_auth(fpath: String, auth: String) -> bool {
    //check file exists
    let path = Path::new(&fpath);
    if !path.exists() {
        println!("File {} does not exist", path.display());
        return false;
    }

    // check file is a file
    if !path.is_file() {
        println!("File {} is not a file", path.display());
        return false;
    }

    // check file size
    let size = std::fs::metadata(&fpath).unwrap().len();

    //check file size is less than 1000 bytes
    if size > 1000 {
        println!("File {} is too large", path.display());
        return false;
    }

    // read file, return false when error
    let got_auth = std::fs::read_to_string(&path);

    // check read error
    if got_auth.is_err() {
        println!("Error reading file {}", path.display());
        return false;
    } else {
        // check auth
        if got_auth.unwrap() != auth {
            println!("Auth does not match");
            return false;
        }
        println!("Auth matches");
        return true;
    }
}

#[tauri::command]
async fn install_python(path: String) -> bool {
    //get python embeddable depending on os
    let os = std::env::consts::OS;
    let url;
    let py_path = Path::new(&path).join("python");
    if !py_path.exists() {
        std::fs::create_dir_all(&py_path).unwrap();
    }
    let zip_path: std::path::PathBuf = Path::new(&path).join("python.zip");

    println!("Path: {}", path);
    if os == "windows" {
        url = "https://www.python.org/ftp/python/3.11.7/python-3.11.7-embed-amd64.zip".to_string()
    } else {
        println!("OS not supported");
        return false;
    }

    //download python embeddable
    let mut resp = reqwest::get(&url).await.unwrap();
    let mut out = std::fs::File::create(&zip_path).unwrap();
    let mut content = Vec::new();
    while let Some(chunk) = resp.chunk().await.unwrap() {
        content.extend_from_slice(&chunk);
    }
    out.write_all(&content).unwrap();

    //extract python embeddable

    use zip::ZipArchive;

    if os == "windows" {
        let mut zipf = ZipArchive::new(std::fs::File::open(&zip_path).unwrap()).unwrap();
        zipf.extract(&py_path).unwrap();
    } else if os == "linux" {
        let mut tarf = tar::Archive::new(std::fs::File::open(&zip_path).unwrap());
        tarf.unpack(&py_path).unwrap();
    } else if os == "macos" {
        let mut zipf = zip::ZipArchive::new(std::fs::File::open(&zip_path).unwrap()).unwrap();
        zipf.extract(&py_path).unwrap();
    } else {
        println!("OS not supported");
        return false;
    }

    let py_exec_path = py_path.join("python.exe");

    //check python is installed
    let mut py = Command::new(py_exec_path);
    let output = py.arg("--version").output();
    match output {
        Ok(o) => {
            let res = String::from_utf8(o.stdout).unwrap();
            if !res.starts_with("Python ") {
                return false;
            }
            println!("{}", res);
            return true;
        }
        Err(e) => {
            println!("{}", e);
            return false;
        }
    }
}

#[tauri::command]
async fn install_pip(path: String) -> bool {
    let py_path = Path::new(&path).join("python");
    let py_exec_path = py_path.join("python.exe");
    let get_pip_url = "https://bootstrap.pypa.io/get-pip.py";
    let mut resp = reqwest::get(get_pip_url).await.unwrap();
    let get_pip_path = Path::new(&path).join("get-pip.py");
    let mut out = std::fs::File::create(&get_pip_path).unwrap();
    let mut content = Vec::new();
    while let Some(chunk) = resp.chunk().await.unwrap() {
        content.extend_from_slice(&chunk);
    }
    out.write_all(&content).unwrap();

    let mut py = Command::new(py_exec_path);
    let output = py.arg(get_pip_path).output();
    match output {
        Ok(o) => {
            let res = String::from_utf8(o.stdout).unwrap();
            println!("{}", res);
            if !res.starts_with("Python ") {
                return false;
            }
            return true;
        }
        Err(e) => {
            println!("{}", e);
            return false;
        }
    }
}

use std::process::Command;

#[tauri::command]
fn check_requirements_local() -> String {
    let mut py = Command::new("python");
    let output = py.arg("--version").output();
    match output {
        Ok(o) => {
            let res = String::from_utf8(o.stdout).unwrap();
            if !res.starts_with("Python ") {
                return "Python is not installed".to_string();
            }
            println!("{}", res);
        }
        Err(e) => {
            println!("{}", e);
            return "Python is not installed, or not loadable".to_string();
        }
    }

    let mut git = Command::new("git");
    let output = git.arg("--version").output();
    match output {
        Ok(o) => {
            let res = String::from_utf8(o.stdout).unwrap();
            if !res.starts_with("git version ") {
                return "Git is not installed".to_string();
            }
            println!("{}", res);
        }
        Err(e) => {
            println!("{}", e);
            return "Git is not installed, or not loadable".to_string();
        }
    }

    return "success".to_string();
}

#[tauri::command]
fn post_py_install(path: String) {
    let py_path = Path::new(&path).join("python");
    let py_pth_path = py_path.join("python311._pth");
    //uncomment python libs
    let mut py_pth = std::fs::read_to_string(&py_pth_path).unwrap();
    py_pth = py_pth.replace("#import site", "import site");
    std::fs::write(&py_pth_path, py_pth).unwrap();

    //create "completed" file
    let completed_path = py_path.join("completed.txt");
    std::fs::write(&completed_path, "python311").unwrap();
}

#[tauri::command]
fn install_py_dependencies(path: String, dependency: String) -> Result<(), String> {
    println!("installing {}", dependency);
    let py_path = Path::new(&path).join("python");
    let py_exec_path = py_path.join("python.exe");
    let mut py = Command::new(py_exec_path);
    let output = py
        .arg("-m")
        .arg("pip")
        .arg("install")
        .arg(dependency)
        .output();
    match output {
        Ok(o) => {
            let res = String::from_utf8(o.stdout).unwrap();
            println!("{}", res);
            return Ok(());
        }
        Err(e) => {
            println!("{}", e);
            return Err(e.to_string());
        }
    }
}

#[tauri::command]
fn run_py_server(handle: tauri::AppHandle, py_path: String) {
    let py_exec_path = Path::new(&py_path).join("python").join("python.exe");
    let server_path = handle
        .path()
        .resolve("src-python/run.py", BaseDirectory::Resource)
        .expect("failed to resolve resource");

    let mut py_server = Command::new(&py_exec_path);
    //set working directory to server path
    py_server.current_dir(server_path.parent().unwrap());

    println!("server_path: {}", server_path.display());
    println!("py_exec_path: {}", py_exec_path.display());
    let mut _child = py_server
        .arg("-m")
        .arg("uvicorn")
        .arg("--port")
        .arg("10026")
        .arg("main:app")
        .spawn()
        .expect("failed to execute process");
    println!("server started");
    return;
}

#[tauri::command]
async fn streamed_fetch(
    id: String,
    url: String,
    headers: String,
    body: String,
    app: AppHandle,
    method: String,
) -> String {
    //parse headers
    let headers_json: Value = match serde_json::from_str(&headers) {
        Ok(h) => h,
        Err(e) => return format!(r#"{{"success":false, body:{}}}"#, e.to_string()),
    };

    let mut headers = HeaderMap::new();
    if let Some(obj) = headers_json.as_object() {
        for (key, value) in obj {
            let header_name = match HeaderName::from_bytes(key.as_bytes()) {
                Ok(name) => name,
                Err(e) => return format!(r#"{{"success":false, body:{}}}"#, e.to_string()),
            };
            let header_value = match HeaderValue::from_str(value.as_str().unwrap_or("")) {
                Ok(value) => value,
                Err(e) => return format!(r#"{{"success":false, body:{}}}"#, e.to_string()),
            };
            headers.insert(header_name, header_value);
        }
    } else {
        return format!(r#"{{"success":false,"body":"Invalid header JSON"}}"#);
    }

    let client = reqwest::Client::new();
    let builder: reqwest::RequestBuilder;
    if method == "POST" {

        let body_decoded = general_purpose::STANDARD.decode(body.as_bytes()).unwrap();

        builder = client
        .post(&url)
        .headers(headers)
        .timeout(Duration::from_secs(240))
        .body(body_decoded)
    }
    else if method == "GET" {
        builder = client
        .get(&url)
        .headers(headers)
        .timeout(Duration::from_secs(240));
    }
    else if method == "PUT" {

        let body_decoded = general_purpose::STANDARD.decode(body.as_bytes()).unwrap();

        builder = client
        .put(&url)
        .headers(headers)
        .timeout(Duration::from_secs(240))
        .body(body_decoded)
    }
    else if method == "DELETE" {

        let body_decoded = general_purpose::STANDARD.decode(body.as_bytes()).unwrap();

        builder = client
        .delete(&url)
        .headers(headers)
        .timeout(Duration::from_secs(240))
        .body(body_decoded)
    }
    else {
        return format!(r#"{{"success":false, body:"Invalid method"}}"#);
    }



    let response = builder
        .send()
        .await;

    match response {
        Ok(mut resp) => {
            let headers = resp.headers();
            let header_json = header_map_to_json(headers);
            app.emit(
                "streamed_fetch",
                &format!(
                    r#"{{"type": "headers", "body": {}, "id": "{}", "status": {}}}"#,
                    header_json,
                    id,
                    resp.status().as_u16()
                ),
            )
            .unwrap();
            loop {
                let byt = resp.chunk().await;
                match byt {
                    Ok(chunk) => {
                        if chunk.is_none() {
                            break;
                        }
                        let chunk = chunk.unwrap();
                        let encoded = general_purpose::STANDARD.encode(chunk);
                        let emited = app.emit(
                            "streamed_fetch",
                            &format!(
                                r#"{{"type": "chunk", "body": "{}", "id": "{}"}}"#,
                                encoded, id
                            ),
                        );

                        match emited {
                            Ok(_) => {}
                            Err(e) => {
                                return format!(r#"{{"success":false, body:{}}}"#, e.to_string())
                            }
                        }
                    }
                    Err(e) => return format!(r#"{{"success":false, body:{}}}"#, e.to_string()),
                }
            }
            app.emit(
                "streamed_fetch",
                &format!(r#"{{"type": "end", "id": "{}"}}"#, id),
            )
            .unwrap();
            return "{\"success\":true}".to_string();
        }
        Err(e) => return format!(r#"{{"success":false, body:{}}}"#, e.to_string()),
    }
}


fn main() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }));
    }

    builder
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            native_request,
            check_auth,
            check_requirements_local,
            install_python,
            install_pip,
            post_py_install,
            run_py_server,
            install_py_dependencies,
            streamed_fetch,
            oauth_login
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}

fn header_map_to_json(header_map: &HeaderMap) -> serde_json::Value {
    let mut map = HashMap::new();
    for (key, value) in header_map {
        map.insert(
            key.as_str().to_string(),
            value.to_str().unwrap().to_string(),
        );
    }
    json!(map)
}
