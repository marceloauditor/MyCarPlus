package br.com.marceloauditor.mycarplus;

import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {

    private WebView printWebView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView appWebView = getBridge().getWebView();
        appWebView.addJavascriptInterface(
                new ReportBridge(appWebView),
                "MyCarNative"
        );
    }

    @Override
    public void onDestroy() {
        destroyPrintWebView();
        super.onDestroy();
    }

    private final class ReportBridge {

        private final WebView appWebView;

        ReportBridge(WebView webView) {
            this.appWebView = webView;
        }

        /** Compatibilidade com relatórios antigos. */
        @JavascriptInterface
        public void printDocument(String jobName) {
            runOnUiThread(() -> printWebView(jobName, appWebView));
        }

        /** Compatibilidade com relatórios antigos. */
        @JavascriptInterface
        public void printHtml(String jobName, String html) {
            runOnUiThread(() -> printHtmlDocument(jobName, html));
        }

        /**
         * Salva o relatório como arquivo HTML temporário e abre o menu nativo
         * de compartilhamento do Android.
         */
        @JavascriptInterface
        public void shareHtml(String jobName, String html) {
            runOnUiThread(() -> writeAndShareHtml(jobName, html));
        }

        /** Compartilha uma capa PNG e o relatório HTML no mesmo envio. */
        @JavascriptInterface
        public void shareHtmlWithCover(String jobName, String html, String coverFileName, String coverBase64) {
            runOnUiThread(() -> writeAndShareHtmlWithCover(jobName, html, coverFileName, coverBase64));
        }

        /** Recebe arquivos binários gerados no JavaScript e abre o compartilhamento nativo. */
        @JavascriptInterface
        public void shareBase64File(String jobName, String fileName, String mimeType, String base64Data) {
            runOnUiThread(() -> writeAndShareBase64File(jobName, fileName, mimeType, base64Data));
        }
    }

    private String safeJobName(String jobName) {
        if (jobName == null || jobName.trim().isEmpty()) {
            return "MyCarPlus_Relatorio";
        }
        return jobName.trim();
    }

    private String safeFileName(String jobName) {
        String normalized = safeJobName(jobName)
                .replaceAll("[^a-zA-Z0-9._-]", "_")
                .replaceAll("_+", "_");
        return normalized.isEmpty() ? "MyCarPlus_Relatorio" : normalized;
    }

    private void showMessage(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }

    private PrintAttributes a4PortraitAttributes() {
        return new PrintAttributes.Builder()
                .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                .build();
    }

    private void destroyPrintWebView() {
        if (printWebView == null) {
            return;
        }
        printWebView.stopLoading();
        printWebView.setWebViewClient(null);
        printWebView.destroy();
        printWebView = null;
    }

    private void printWebView(String jobName, WebView webView) {
        PrintManager printManager =
                (PrintManager) getSystemService(Context.PRINT_SERVICE);

        if (printManager == null || webView == null) {
            showMessage("Serviço de impressão indisponível.");
            return;
        }

        String safeName = safeJobName(jobName);
        PrintDocumentAdapter adapter =
                webView.createPrintDocumentAdapter(safeName);

        printManager.print(
                safeName,
                adapter,
                a4PortraitAttributes()
        );
    }

    private void printHtmlDocument(String jobName, String html) {
        if (html == null || html.trim().isEmpty()) {
            showMessage("Relatório vazio. Não foi possível abrir a impressão.");
            return;
        }

        destroyPrintWebView();
        final String safeName = safeJobName(jobName);

        printWebView = new WebView(this);
        printWebView.getSettings().setJavaScriptEnabled(true);
        printWebView.getSettings().setDefaultTextEncodingName("UTF-8");
        printWebView.setWebViewClient(new WebViewClient() {
            private boolean printStarted = false;

            @Override
            public void onPageFinished(WebView view, String url) {
                if (printStarted) {
                    return;
                }
                printStarted = true;
                view.postDelayed(() -> printWebView(safeName, view), 350L);
            }
        });
        printWebView.loadDataWithBaseURL(
                "https://appassets.androidplatform.net/",
                html,
                "text/html",
                "UTF-8",
                null
        );
    }

    private void writeAndShareHtml(String jobName, String html) {
        if (html == null || html.trim().isEmpty()) {
            showMessage("Relatório vazio. Não foi possível compartilhar.");
            return;
        }

        File shareDirectory = new File(getCacheDir(), "shared_reports");
        if (!shareDirectory.exists() && !shareDirectory.mkdirs()) {
            showMessage("Não foi possível preparar a pasta de compartilhamento.");
            return;
        }

        deleteOldSharedReports(shareDirectory);

        File htmlFile = new File(
                shareDirectory,
                safeFileName(jobName) + ".html"
        );

        try (FileOutputStream output = new FileOutputStream(htmlFile)) {
            output.write(html.getBytes(StandardCharsets.UTF_8));
            output.flush();
        } catch (IOException error) {
            if (htmlFile.exists()) {
                htmlFile.delete();
            }
            showMessage("Não foi possível criar o arquivo HTML para compartilhar.");
            return;
        }

        shareHtmlFile(htmlFile, jobName);
    }

    private void writeAndShareHtmlWithCover(String jobName, String html, String coverFileName, String coverBase64) {
        if (html == null || html.trim().isEmpty() || coverBase64 == null || coverBase64.trim().isEmpty()) {
            writeAndShareHtml(jobName, html);
            return;
        }
        File shareDirectory = new File(getCacheDir(), "shared_reports");
        if (!shareDirectory.exists() && !shareDirectory.mkdirs()) {
            showMessage("Não foi possível preparar a pasta de compartilhamento."); return;
        }
        deleteOldSharedReports(shareDirectory);
        File htmlFile = new File(shareDirectory, safeFileName(jobName) + ".html");
        String safeCoverName = coverFileName == null ? "CAPA_RELATORIO_MYCAR_PLUS.png" : coverFileName.replaceAll("[^a-zA-Z0-9._-]", "_");
        File coverFile = new File(shareDirectory, safeCoverName);
        try (FileOutputStream htmlOutput = new FileOutputStream(htmlFile); FileOutputStream coverOutput = new FileOutputStream(coverFile)) {
            htmlOutput.write(html.getBytes(StandardCharsets.UTF_8)); htmlOutput.flush();
            coverOutput.write(Base64.decode(coverBase64, Base64.DEFAULT)); coverOutput.flush();
        } catch (Exception error) {
            if (htmlFile.exists()) htmlFile.delete(); if (coverFile.exists()) coverFile.delete();
            showMessage("Não foi possível preparar os arquivos para compartilhar."); return;
        }
        shareHtmlAndCover(htmlFile, coverFile, jobName);
    }

    private void shareHtmlAndCover(File htmlFile, File coverFile, String jobName) {
        try {
            Uri htmlUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", htmlFile);
            Uri coverUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", coverFile);
            ArrayList<Uri> uris = new ArrayList<>(); uris.add(coverUri); uris.add(htmlUri);
            Intent intent = new Intent(Intent.ACTION_SEND_MULTIPLE);
            intent.setType("*/*"); intent.putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris);
            intent.putExtra(Intent.EXTRA_SUBJECT, safeJobName(jobName).replace('_', ' '));
            ClipData clipData = ClipData.newRawUri("Capa MyCar+", coverUri); clipData.addItem(new ClipData.Item(htmlUri));
            intent.setClipData(clipData); intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(intent, "Compartilhar relatório");
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION); chooser.setClipData(clipData);
            if (chooser.resolveActivity(getPackageManager()) == null) { showMessage("Nenhum aplicativo disponível para compartilhar o relatório."); return; }
            startActivity(chooser);
        } catch (Exception error) { showMessage("Não foi possível abrir os aplicativos de compartilhamento."); }
    }

    private void shareHtmlFile(File htmlFile, String jobName) {
        if (!htmlFile.exists() || htmlFile.length() == 0L) {
            showMessage("O arquivo do relatório não foi criado corretamente.");
            return;
        }

        try {
            Uri htmlUri = FileProvider.getUriForFile(
                    this,
                    getPackageName() + ".fileprovider",
                    htmlFile
            );

            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType("text/html");
            shareIntent.putExtra(Intent.EXTRA_STREAM, htmlUri);
            shareIntent.putExtra(
                    Intent.EXTRA_SUBJECT,
                    safeJobName(jobName).replace('_', ' ')
            );
            shareIntent.setClipData(
                    ClipData.newRawUri("Relatório MyCar+", htmlUri)
            );
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            Intent chooser = Intent.createChooser(
                    shareIntent,
                    "Compartilhar relatório"
            );
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            chooser.setClipData(
                    ClipData.newRawUri("Relatório MyCar+", htmlUri)
            );

            if (chooser.resolveActivity(getPackageManager()) == null) {
                showMessage("Nenhum aplicativo disponível para compartilhar o relatório.");
                return;
            }

            startActivity(chooser);
        } catch (Exception error) {
            showMessage("Não foi possível abrir os aplicativos de compartilhamento.");
        }
    }

    private void writeAndShareBase64File(
            String jobName,
            String fileName,
            String mimeType,
            String base64Data
    ) {
        if (base64Data == null || base64Data.trim().isEmpty()) {
            showMessage("Arquivo vazio. Não foi possível compartilhar.");
            return;
        }
        File shareDirectory = new File(getCacheDir(), "shared_reports");
        if (!shareDirectory.exists() && !shareDirectory.mkdirs()) {
            showMessage("Não foi possível preparar a pasta de compartilhamento.");
            return;
        }
        deleteOldSharedReports(shareDirectory);
        String safeName = fileName == null ? "MyCarPlus.xlsx" : fileName.replaceAll("[^a-zA-Z0-9._-]", "_");
        File outputFile = new File(shareDirectory, safeName);
        try (FileOutputStream output = new FileOutputStream(outputFile)) {
            output.write(Base64.decode(base64Data, Base64.DEFAULT));
            output.flush();
        } catch (Exception error) {
            if (outputFile.exists()) outputFile.delete();
            showMessage("Não foi possível criar o arquivo XLSX.");
            return;
        }
        shareBinaryFile(outputFile, jobName, mimeType);
    }

    private void shareBinaryFile(File file, String jobName, String mimeType) {
        try {
            Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", file);
            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType(mimeType == null || mimeType.isEmpty() ? "application/octet-stream" : mimeType);
            intent.putExtra(Intent.EXTRA_STREAM, uri);
            intent.putExtra(Intent.EXTRA_SUBJECT, safeJobName(jobName).replace('_', ' '));
            intent.setClipData(ClipData.newRawUri("Arquivo MyCar+", uri));
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(intent, "Salvar ou compartilhar arquivo XLSX");
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            chooser.setClipData(ClipData.newRawUri("Arquivo MyCar+", uri));
            startActivity(chooser);
        } catch (Exception error) {
            showMessage("Não foi possível abrir os aplicativos para salvar o XLSX.");
        }
    }

    private void deleteOldSharedReports(File shareDirectory) {
        File[] files = shareDirectory.listFiles();
        if (files == null) {
            return;
        }

        long expiration =
                System.currentTimeMillis() - (24L * 60L * 60L * 1000L);
        for (File file : files) {
            if (file.isFile() && file.lastModified() < expiration) {
                file.delete();
            }
        }
    }
}
