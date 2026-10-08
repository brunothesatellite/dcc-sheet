package com.dccsheet.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Point d'entree de l'APK : une WebView sur l'origine
 * https://appassets.androidplatform.net (WebViewAssetHandler) qui
 * execute la webapp dcc-sheet.
 *
 *   - /dcc-sheet/boot-poc.html en premier : page d'amorçage (inscrit
 *     le Service Worker php-cgi-wasm, ecrit sources PHP + .so dans
 *     l'IDBFS, redirige vers /dcc-sheet/) ;
 *   - tous les *.php passent par le Service Worker (php-cgi-wasm) ;
 *   - le reste (statique, vendor, .wasm, .so) vient des assets via
 *     AssetRouter.
 */
public class MainActivity extends Activity {

    private static final String BOOT_URL =
            "https://appassets.androidplatform.net/dcc-sheet/boot-poc.html";
    private static final int FILE_CHOOSER_REQUEST = 1001;

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);      /* localStorage de la webapp */
        settings.setDatabaseEnabled(true);        /* DOM storage legacy */
        settings.setAllowFileAccess(false);       /* assets seulement */
        settings.setAllowContentAccess(true);     /* URIs content:// du file picker */
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        /* Debug via chrome://inspect uniquement en build debuggable. */
        boolean debuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(debuggable);

        final AssetRouter router = new AssetRouter(getAssets());

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view,
                                                              WebResourceRequest request) {
                try {
                    return router.respond(request.getUrl().getPath());
                } catch (Exception e) {
                    return null; /* repli reseau reel (bloque : pas de INTERNET) */
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view,
                                                    WebResourceRequest request) {
                /* Tout reste dans l'app : memes origines internes, le
                   reste (externe) est deja bloque sans permission. */
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view,
                                             ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), FILE_CHOOSER_REQUEST);
                } catch (Exception e) {
                    filePathCallback = null;
                    callback.onReceiveValue(null);
                    return false;
                }
                return true;
            }
        });

        setContentView(webView);

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(BOOT_URL);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST && filePathCallback != null) {
            Uri[] uris = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                uris = new Uri[]{data.getData()};
            }
            filePathCallback.onReceiveValue(uris);
            filePathCallback = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
