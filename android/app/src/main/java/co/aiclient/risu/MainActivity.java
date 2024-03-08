package co.aiclient.risu;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(StreamedPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
