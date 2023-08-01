// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]


#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

use serde_json::Value;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use base64::{engine::general_purpose, Engine as _};
use std::{time::Duration, path::Path};
use serde_json::json;
use std::collections::HashMap;

#[tauri::command]
async fn native_request(url: String, body: String, header: String, method:String) -> String {
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
    let response:Result<reqwest::Response, reqwest::Error>;

    if method == "POST" {
        response = client
        .post(&url)
        .headers(headers)
        .timeout(Duration::from_secs(120))
        .body(body)
        .send()
        .await;
    }
    else{
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
            let bytes = match resp.bytes().await {
                Ok(b) => b,
                Err(e) => return format!(r#"{{"success":false,"body":"{}"}}"#, e.to_string()),
            };
            let encoded = general_purpose::STANDARD.encode(&bytes);

            format!(r#"{{"success":true,"body":"{}","headers":{}}}"#, encoded, header_json)
        }
        Err(e) => format!(r#"{{"success":false,"body":"{}"}}"#, e.to_string()),
    }
}

#[tauri::command]
fn check_auth(fpath: String, auth: String) -> bool{
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
    }
    else{
        // check auth
        if got_auth.unwrap() != auth {
            println!("Auth does not match");
            return false;
        }
        println!("Auth matches");
        return true;
    }
    
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet, native_request, check_auth])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


fn header_map_to_json(header_map: &HeaderMap) -> serde_json::Value {
    let mut map = HashMap::new();
    for (key, value) in header_map {
        map.insert(key.as_str().to_string(), value.to_str().unwrap().to_string());
    }
    json!(map)
}