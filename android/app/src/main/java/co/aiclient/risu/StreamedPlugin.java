package co.aiclient.risu;

import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Iterator;

@CapacitorPlugin(name = "streamedFetch")
public class StreamedPlugin extends Plugin {



    @PluginMethod()
    public void streamedFetch(PluginCall call) {
        String id = call.getString("id");
        String urlParam = call.getString("url");
        String bodyString = call.getString("body");
        JSObject headers = call.getObject("headers");


        URL url = null;

        try {
            url = new URL(urlParam);
            HttpURLConnection urlConnection = (HttpURLConnection) url.openConnection();
            byte[] bodyEncodedByte = bodyString.getBytes("UTF-8");
            byte[] bodyByte = Base64.decode(bodyEncodedByte, Base64.DEFAULT);
            Iterator<String> keys = headers.keys();
            urlConnection.setRequestMethod("POST");
            while(keys.hasNext()) {
                String key = keys.next();
                if (headers.get(key) instanceof JSONObject) {
                    urlConnection.setRequestProperty(key, headers.getString(key));
                }
            }
            urlConnection.setRequestProperty("Content-Length", String.valueOf(bodyByte.length));
            urlConnection.setDoInput(true);
            OutputStream out = new BufferedOutputStream(urlConnection.getOutputStream());
            out.write(bodyByte);
            try {
                InputStream in = new BufferedInputStream(urlConnection.getInputStream());
                int resCode = urlConnection.getResponseCode();
                JSObject resObj = new JSObject();
                JSObject headerObj = new JSObject();
                resObj.put("id", id);
                resObj.put("type", "headers");
                resObj.put("status", resCode);

                int i = 0;
                while (true){
                    String headerName = urlConnection.getHeaderFieldKey(i);
                    String headerValue = urlConnection.getHeaderField(i);
                    i++;

                    if(headerValue == null){
                        break;
                    }
                    if(headerName == null){
                        continue;
                    }

                    headerObj.put(headerName, headerValue);
                }
                resObj.put("body", headerObj);
                notifyListeners("streamed_fetch", resObj);

                while (true){
                    int ableBytes = in.available();
                    byte[] buf = new byte[ableBytes];
                    int bytesRead = in.read(buf, 0, ableBytes);
                    if(bytesRead == -1){
                        break;
                    }
                    byte[] encodedBuf = Base64.encode(buf, Base64.DEFAULT);
                    JSObject obj = new JSObject();
                    obj.put("id", id);
                    obj.put("body", encodedBuf);
                    obj.put("type", "chunk");
                    notifyListeners("streamed_fetch", obj);
                }
                JSObject endObj = new JSObject();
                endObj.put("id", id);
                endObj.put("type", "end");
                notifyListeners("streamed_fetch", endObj);
            } finally {
                urlConnection.disconnect();
            }
        } catch (IOException e) {
            JSObject obj = new JSObject();
            obj.put("error", String.valueOf(e));
            call.resolve(obj);
            return;
        } catch (JSONException e) {
            JSObject obj = new JSObject();
            obj.put("error", String.valueOf(e));
            call.resolve(obj);
            return;
        }

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }
}
