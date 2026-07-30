package br.com.marceloauditor.mycarplus;

import android.content.Context;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = getBridge().getWebView();
        webView.addJavascriptInterface(new ReportPrintBridge(webView), "MyCarNative");
    }

    private class ReportPrintBridge {
        private final WebView webView;

        ReportPrintBridge(WebView webView) {
            this.webView = webView;
        }

        @JavascriptInterface
        public void printDocument(String jobName) {
            runOnUiThread(() -> {
                PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                if (printManager == null) return;
                String safeName = (jobName == null || jobName.trim().isEmpty())
                        ? "MyCarPlus_Relatorio" : jobName.trim();
                PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(safeName);
                printManager.print(safeName, adapter, new PrintAttributes.Builder().build());
            });
        }
    }
}
