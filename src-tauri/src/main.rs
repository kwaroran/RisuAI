// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]


#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

use actix_web::dev::Server;
use actix_web::http::header;
use serde_json::Value;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use base64::{engine::general_purpose, Engine as _};
use tauri::Manager;
use tauri::State;
use std::io::Write;
use std::sync::Mutex;
use std::{time::Duration, path::Path};
use serde_json::json;
use std::collections::HashMap;
use actix_cors::Cors;
use tauri::api::path::app_data_dir;
use actix_web::{web, HttpRequest, HttpResponse, HttpServer, Responder, App, post, get};
use std::fs::File;
struct HttpSecret(Mutex<String>);
struct HttpPort(Mutex<u16>);

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

#[tauri::command]
async fn install_python(path:String) -> bool{
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
    }
    else{
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
    }
    else if os == "linux" {
        let mut tarf = tar::Archive::new(std::fs::File::open(&zip_path).unwrap());
        tarf.unpack(&py_path).unwrap();
    }
    else if os == "macos" {
        let mut zipf = zip::ZipArchive::new(std::fs::File::open(&zip_path).unwrap()).unwrap();
        zipf.extract(&py_path).unwrap();
    }
    else{
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
                return false
            }
            println!("{}", res);
            return true
        },
        Err(e) => {
            println!("{}", e);
            return false
        }
    }
}

#[tauri::command]
async fn install_pip(path:String) -> bool{
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
                return false
            }
            return true
        },
        Err(e) => {
            println!("{}", e);
            return false
        }
    }    
}

use std::process::Command;

#[tauri::command]
fn check_requirements_local() -> String{
    let mut py = Command::new("python");
    let output = py.arg("--version").output();
    match output {
        Ok(o) => {
            let res = String::from_utf8(o.stdout).unwrap();
            if !res.starts_with("Python ") {
                return "Python is not installed".to_string()
            }
            println!("{}", res);
        },
        Err(e) => {
            println!("{}", e);
            return "Python is not installed, or not loadable".to_string()
        }
    }

    let mut git = Command::new("git");
    let output = git.arg("--version").output();
    match output {
        Ok(o) => {
            let res = String::from_utf8(o.stdout).unwrap();
            if !res.starts_with("git version ") {
                return "Git is not installed".to_string()
            }
            println!("{}", res);
        },
        Err(e) => {
            println!("{}", e);
            return "Git is not installed, or not loadable".to_string()
        }
    }

    return "success".to_string()
}

#[tauri::command]
fn post_py_install(path:String){
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
fn install_py_dependencies(path:String, dependency:String) -> Result<(), String>{
    println!("installing {}", dependency);
    let py_path = Path::new(&path).join("python");
    let py_exec_path = py_path.join("python.exe");
    let mut py = Command::new(py_exec_path);
    let output = py.arg("-m").arg("pip").arg("install").arg(dependency).output();
    match output {
        Ok(o) => {
            let res = String::from_utf8(o.stdout).unwrap();
            println!("{}", res);
            return Ok(())
        },
        Err(e) => {
            println!("{}", e);
            return Err(e.to_string())
        }
    }
}

#[tauri::command]
fn run_py_server(handle: tauri::AppHandle, py_path:String){
    let py_exec_path = Path::new(&py_path).join("python").join("python.exe");
    let server_path = handle.path_resolver().resolve_resource("src-python/run.py").expect("failed to resolve resource");

    let mut py_server = Command::new(&py_exec_path);
    //set working directory to server path
    py_server.current_dir(server_path.parent().unwrap());

    println!("server_path: {}", server_path.display());
    println!("py_exec_path: {}", py_exec_path.display());
    let mut _child = py_server.arg("-m").arg("uvicorn").arg("--port").arg("10026").arg("main:app").spawn().expect("failed to execute process");
    println!("server started");
    return
}

#[tauri::command]
fn run_server_local(){
    let app_base_path = tauri::api::path::data_dir().unwrap().join("co.aiclient.risu");

    //check app base path exists
    if !app_base_path.exists() {
        std::fs::create_dir_all(&app_base_path).unwrap();
    }

    let server_path = app_base_path.clone().join("local_server");

    //check server path exists
    if !&server_path.exists() {
        //git clone server
        let mut git = Command::new("git");
        let output = git
            .current_dir(&app_base_path.clone())
            .arg("clone")
            .arg("https://github.com/kwaroran/risu-exllama-connector.git")
            .output();
        match output {
            Ok(o) => {
                let res = String::from_utf8(o.stdout).unwrap();
                println!("output: {}", res);
            },
            Err(e) => {
                println!("{}", e);
                return
            }
        }

        println!("cloned");

        let git_cloned_path = app_base_path.clone().join("risu-exllama-connector");

        println!("git_cloned_path: {}", git_cloned_path.display());
        //rename folder to local_server
        std::fs::rename(git_cloned_path, server_path.clone()).unwrap();
    }


    //check os is windows
    if cfg!(target_os = "windows") {
        println!("windows runner");
        let command_location = &server_path.clone().join("run.cmd");
        let mut server = Command::new(command_location);
        let mut _child = server.current_dir(server_path).spawn().expect("failed to execute process");
    }
    else{
        println!("linux/mac runner");
        let command_location = &server_path.clone().join("run.sh");
        let mut server = Command::new(command_location);
        let mut _child = server.current_dir(server_path).spawn().expect("failed to execute process");
    }
    return

}

#[tauri::command]
async fn streamed_fetch(id:String, url:String, headers: String, body: String, handle: tauri::AppHandle) -> String {
    //parse headers
    let headers_json: Value = match serde_json::from_str(&headers) {
        Ok(h) => h,
        Err(e) => return format!(r#"{{"success":false, body:{}}}"#, e.to_string()),
    };
    let app = handle.app_handle();
    
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
    let response = client
        .post(&url)
        .headers(headers)
        .timeout(Duration::from_secs(240))
        .body(body)
        .send().await;

    match response {
        Ok(mut resp) => {
            let headers = resp.headers();
            let header_json = header_map_to_json(headers);
            app.emit_all("streamed_fetch", &format!(r#"{{"type": "headers", "body": {}, "id": "{}", "status": {}}}"#, header_json, id, resp.status().as_u16())).unwrap();
            loop {
                let byt = resp.chunk().await;
                match byt {
                    Ok(chunk) => {
                        if chunk.is_none() {
                            break;
                        }
                        let chunk = chunk.unwrap();
                        let encoded = general_purpose::STANDARD.encode(chunk);
                        let emited = app.emit_all("streamed_fetch", &format!(r#"{{"type": "chunk", "body": "{}", "id": "{}"}}"#, encoded, id));

                        match emited {
                            Ok(_) => {},
                            Err(e) => {
                                return format!(r#"{{"success":false, body:{}}}"#, e.to_string())
                            }
                        }
                    }
                    Err(e) => {
                        return format!(r#"{{"success":false, body:{}}}"#, e.to_string())
                    }
                }
            }
            app.emit_all("streamed_fetch", &format!(r#"{{"type": "end", "id": "{}"}}"#, id)).unwrap();
            return "{\"success\":true}".to_string();
        }
        Err(e) => {
            return format!(r#"{{"success":false, body:{}}}"#, e.to_string())
        }
    }
}

#[tauri::command]
fn get_http_secret(secret_state: State<HttpSecret>) -> String {
    secret_state.0.lock().unwrap().clone()
}

#[tauri::command]
fn get_http_port(port_state: State<HttpPort>) -> u16 {
    port_state.0.lock().unwrap().clone()
}

#[post("/")]
async fn write_binary_file_to_appdata(req: HttpRequest, body: web::Bytes, app_handle: web::Data<tauri::AppHandle>, secret: web::Data<String>) -> impl Responder {
    let query = req.query_string();
    let headers = req.headers();
    let req_secret = headers.get("x-tauri-secret").unwrap().to_str().unwrap();
    if req_secret != *secret.as_ref() {
        return HttpResponse::Unauthorized().body("Unauthorized");
    }
    let params: std::collections::HashMap<_, _> = url::form_urlencoded::parse(query.as_bytes()).into_owned().collect();
    let app_data_dir = app_data_dir(&app_handle.config()).expect("App dir must be returned by tauri");
    if let Some(file_path) = params.get("path") {
        let full_path = app_data_dir.join(file_path);
        if let Some(parent) = Path::new(&full_path).parent() {
            if let Err(e) = std::fs::create_dir_all(parent) {
                return HttpResponse::InternalServerError().body(format!("Failed to create directories: {}", e));
            }
        }
    
        match File::create(&full_path) {
            Ok(mut file) => {
                if let Err(e) = file.write_all(&body) {
                    return HttpResponse::InternalServerError().body(format!("Failed to write to file: {}", e));
                }
                HttpResponse::Ok().body("File written successfully")
            }
            Err(e) => HttpResponse::InternalServerError().body(format!("Failed to create file: {}", e)),
        }
    } else {
        HttpResponse::BadRequest().body("Missing file path in query string")
    }
}

async fn run_http_server(handle: tauri::AppHandle, secret: String) {
    for port in 5354..65535 {
        let handle_copy = handle.clone();
        let secret_copy = secret.clone();
        let res = HttpServer::new(move || {
            App::new()
                .wrap(
                    Cors::default()
                        .allow_any_origin()
                        .allow_any_method()
                        .allow_any_header()
                        .max_age(3600)
                )
                .app_data(web::PayloadConfig::new(1024 * 1024 * 1024))  // 1 GB 
                .app_data(web::Data::new(handle_copy.clone()))
                .app_data(web::Data::new(secret_copy.clone()))
                .service(write_binary_file_to_appdata)
        })
            .bind(("127.0.0.1", port));
        match res {
            Ok(server) => {
                handle.manage(HttpPort(Mutex::new(port)));
                server.run().await;
                break;
            }
            Err(e) => {
                eprintln!("Failed to bind to port {}: {}", port, e);
            }
        }
    }
}

fn main() {
    tauri::Builder::default()
        .manage(HttpSecret(uuid::Uuid::new_v4().to_string().into()))
        .invoke_handler(tauri::generate_handler![
            greet,
            native_request,
            check_auth,
            check_requirements_local,
            run_server_local,
            install_python,
            install_pip,
            post_py_install,
            run_py_server,
            install_py_dependencies,
            streamed_fetch,
            get_http_secret,
            get_http_port
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            let secret_state: State<HttpSecret> = app.state();
            let secret = secret_state.0.lock().unwrap().clone();
            std::thread::spawn(move || {
                let rt = actix_rt::Runtime::new().unwrap();
                rt.block_on(run_http_server(handle.clone(), secret.clone()));
            });
            Ok(())
        })
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
