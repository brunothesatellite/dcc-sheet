package com.dccsheet.app;

import android.annotation.SuppressLint;
import android.annotation.TargetApi;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

    /* Hook injecté à chaque fin de page : conserve les blobs créés par
       la webapp (elle révoque l'URL immédiatement après a.click()) et
       retient le dernier attribut download= (nom exact du fichier,
       le contentDisposition de DownloadListener est vide). */
    private static final String BLOB_HOOK_JS =
            "(function(){"
            + "if(window.__dccBlobReg)return 'deja';"
            + "var reg={},order=[];window.__dccBlobReg=reg;"
            + "var oc=URL.createObjectURL;"
            + "URL.createObjectURL=function(o){"
            + "var u=oc.call(URL,o);"
            + "try{if(o instanceof Blob){reg[u]=o;order.push(u);"
            + "while(order.length>64){delete reg[order.shift()];}}}catch(e){}"
            + "return u;};"
            + "var ocl=HTMLAnchorElement.prototype.click;"
            + "HTMLAnchorElement.prototype.click=function(){"
            + "try{var d=this.getAttribute('download');"
            + "if(d&&this.href&&this.href.indexOf('blob:')===0)"
            + "window.__dccLastDownloadName=d;}catch(e){}"
            + "return ocl.apply(this,arguments);};"
            + "return 'installe';})()";

    /* Hook injecté à chaque fin de page : portrait-guard.js affiche un
       placeholder SANS requête pour tout dossier absent d'icons.php —
       or dcc-pc-tokens/funnel-tokens ne sont JAMAIS dans les assets de
       l'APK (règle de redistribution) alors qu'ils sont bien servis par
       l'APK compagnon (ContentProvider). On déclare ces deux dossiers
       présents — UNIQUEMENT si l'APK conteneur est bien installé
       (voir contentInstalled()) : sinon ces hooks déclareraient des
       dossiers absents comme disponibles, le sélecteur proposerait des
       sources mortes et chaque vignette rendrait un 403 (icône brisée)
       au lieu du repli natif de la webapp (placeholder, zéro requête).
       Webapp inchangée : correctif app-side, idempotent,
       même mécanisme que BLOB_HOOK_JS. */
    private static final String GUARD_HOOK_JS =
            "(function(){"
            + "if(window.__dccGuardHooked)return 'deja';"
            + "window.__dccGuardHooked=1;"
            + "try{var g=window.DCCPortraitGuard;if(!g)return 'sans-guard';"
            + "var ok={'dcc-pc-tokens':1,'funnel-tokens':1};"
            + "var okKey={'dcc':1,'funnel':1};"
            + "var fa=g.folderAvailable;"
            + "g.folderAvailable=function(f){"
            + "if(f&&ok[f])return true;return fa.apply(g,arguments);};"
            + "var hs=g.has;"
            + "g.has=function(k){"
            + "if(okKey[k])return true;return hs.apply(g,arguments);};"
            + "var ms=g.isMissing;"
            + "g.isMissing=function(k){"
            + "if(okKey[k])return false;return ms.apply(g,arguments);};"
            + "var im=g.isMissingSrc;"
            + "g.isMissingSrc=function(s){"
            + "s=String(s||'');"
            + "if(s.indexOf('icons/')===0){var i=s.lastIndexOf('/');"
            + "if(i>6&&ok[s.slice(6,i)])return false;}"
            + "return im.apply(g,arguments);};"
            + "return 'installe';}catch(e){return 'ERR '+e;}})()";

    /* Hook injecté au DÉBUT de page (onPageStarted) puis en fin de page
       (filet de sécurité) : api/icons.php?action=list ne connaît que les
       dossiers PRESENTS DANS LES ASSETS — les tokens dcc-pc-tokens /
       funnel-tokens sont servis par l'APK compagnon. Le sélecteur de
       portraits filtre ses vignettes sur ce tableau brut, mis en cache
       dès l'init (iconDirsPromise) : la réponse est donc complétée
       AVANT qu'api() ne la lise. Injecté UNIQUEMENT si le conteneur est
       installé (contentInstalled()) : sans lui, la liste native (sans
       tokens) déclenche le repli de la webapp — pas de source morte.
       Webapp inchangée, idempotent ;
       le drapeau n'est posé qu'en cas de succès (l'objet window peut
       changer entre onPageStarted et le document final). */
    private static final String FETCH_HOOK_JS =
            "(function(){"
            + "try{"
            + "if(window.__dccFetchListHooked)return 'deja';"
            + "if(typeof window.fetch!=='function')return 'sans-fetch';"
            + "var of=window.fetch;"
            + "window.fetch=function(){"
            + "var u=arguments[0];"
            + "var url=typeof u==='string'?u:(u&&u.url)||'';"
            + "if(url.indexOf('icons.php')===-1||url.indexOf('action=list')===-1)"
            + "return of.apply(window,arguments);"
            + "return of.apply(window,arguments).then(function(r){"
            + "if(!r||!r.ok)return r;"
            + "return r.clone().json().then(function(j){"
            + "if(!j||!Array.isArray(j.dirs))return r;"
            + "if(j.dirs.indexOf('dcc-pc-tokens')<0)j.dirs.push('dcc-pc-tokens');"
            + "if(j.dirs.indexOf('funnel-tokens')<0)j.dirs.push('funnel-tokens');"
            + "return new Response(JSON.stringify(j),{status:r.status,"
            + "statusText:r.statusText,headers:r.headers});"
            + "}).catch(function(){return r;});"
            + "});};"
            + "window.__dccFetchListHooked=1;"
            + "return 'installe';"
            + "}catch(e){return 'ERR '+e;}})()";

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;

    /**
     * Vrai si l'APK conteneur de contenu (com.dccsheet.content) est
     * installé. Les hooks tokens (FETCH_HOOK_JS / GUARD_HOOK_JS) ne
     * s'injectent que dans ce cas : sans conteneur, on laisse la webapp
     * appliquer son repli natif (sources tokens non proposées,
     * placeholder portrait-guard) au lieu de liens brisés (403).
     * Re-testé à chaque page : installer/désinstaller le conteneur
     * suffit, le prochain chargement s'adapte.
     */
    private boolean contentInstalled() {
        try {
            return getPackageManager()
                    .resolveContentProvider("com.dccsheet.content", 0) != null;
        } catch (Exception e) {
            return false;
        }
    }

    /** Recuperation des exports blob (téléchargements webapp). */
    private final ConcurrentHashMap<String, PendingBlob> pendingBlobs =
            new ConcurrentHashMap<>();
    private ExecutorService saveExecutor;

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

        final AssetRouter router = new AssetRouter(getAssets(), getContentResolver());

        /* LES REQUETES DU SERVICE WORKER NE PASSENT PAS PAR
           WebViewClient.shouldInterceptRequest : le framework fournit un
           hook dedie, sans lequel l'enregistrement du SW echoue
           (\"fetching the script\"). Meme routage que la page. */
        ServiceWorkerController.getInstance().setServiceWorkerClient(
                new ServiceWorkerClient() {
                    @Override
                    public WebResourceResponse shouldInterceptRequest(
                            WebResourceRequest request) {
                        String p = request.getUrl().getPath();
                        try {
                            WebResourceResponse r = router.respond(p);
                            Log.d("DCC", "INT[SW] " + p + " -> "
                                    + (r == null ? "net" : r.getStatusCode()));
                            return r;
                        } catch (Exception e) {
                            Log.d("DCC", "INT[SW] " + p + " -> EXC " + e);
                            return null; /* repli reseau reel (bloque : pas de INTERNET) */
                        }
                    }
                });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view,
                                                              WebResourceRequest request) {
                String p = request.getUrl().getPath();
                try {
                    WebResourceResponse r = router.respond(p);
                    Log.d("DCC", "INT[CV] " + p + " -> "
                            + (r == null ? "net" : r.getStatusCode()));
                    return r;
                } catch (Exception e) {
                    Log.d("DCC", "INT[CV] " + p + " -> EXC " + e);
                    return null; /* repli reseau reel (bloque : pas de INTERNET) */
                }
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                Log.d("DCC", "START " + url);
                /* Des le debut de page : completer icons.php?action=list
                   avant l'init de la webapp (cache iconDirsPromise).
                   Uniquement avec le conteneur installe : sinon la liste
                   native (sans tokens) fait office de repli. */
                if (contentInstalled()) {
                    view.evaluateJavascript(FETCH_HOOK_JS,
                            v -> Log.d("DCC", "FETCH " + url + " -> " + v));
                } else {
                    Log.d("DCC", "HOOKS-TOKENS conteneur absent -> repli webapp");
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                Log.d("DCC", "DONE " + url);
                /* Garde-fous export : la webapp révoque l'URL blob
                   juste après a.click() (script.js), un fetch sur cette URL
                   échoue donc. On conserve les blobs créés (FIFO) et le
                   dernier attribu download= (contentDisposition de la
                   WebView arrive vide). Idempotent. */
                view.evaluateJavascript(BLOB_HOOK_JS,
                        v -> Log.d("DCC", "HOOK " + url + " -> " + v));
                if (contentInstalled()) {
                    view.evaluateJavascript(FETCH_HOOK_JS,
                            v -> Log.d("DCC", "FETCH " + url + " -> " + v));
                    view.evaluateJavascript(GUARD_HOOK_JS,
                            v -> Log.d("DCC", "GUARD " + url + " -> " + v));
                } else {
                    Log.d("DCC", "HOOKS-TOKENS conteneur absent -> repli webapp");
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request,
                                        WebResourceError error) {
                Log.d("DCC", "ERR " + error.getErrorCode() + " "
                        + error.getDescription()
                        + " main=" + request.isForMainFrame()
                        + " " + request.getUrl());
            }

            @Override
            public void onReceivedHttpError(WebView view,
                                            WebResourceRequest request,
                                            WebResourceResponse response) {
                if (response.getStatusCode() >= 400) {
                    Log.d("DCC", "HTTP " + response.getStatusCode()
                            + " main=" + request.isForMainFrame()
                            + " " + request.getUrl());
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

        /* EXPORTS : la webapp génère ses fichiers via <a download> +
           URL blob. Sans DownloadListener, la WebView avale
           silencieusement la demande (aucun octet écrit) — d'où
           « Export réussi » sans fichier. On relit le blob dans le
           rendu (mémoire locale, aucune permission réseau) par
           paquets base64 (pont JS→Java limité ~1 Mo) et on écrit
           dans Téléchargements via MediaStore. */
        saveExecutor = Executors.newSingleThreadExecutor();
        webView.addJavascriptInterface(new DccBridge(), "DccBridge");
        webView.setDownloadListener(this::onDownloadStart);

        /* FENETRE EDGE-TO-EDGE (cible API 35+ imposee) : la WebView couvre
           tout l'ecran, la barre d'etat et l'encoche recouvreraient le
           header de la page. On decale la WebView des insets systeme via
           un parent qui les applique en marges. */
        FrameLayout root = new FrameLayout(this);
        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            FrameLayout.LayoutParams params =
                    (FrameLayout.LayoutParams) webView.getLayoutParams();
            int top;
            int bottom;
            if (Build.VERSION.SDK_INT >= 30) {
                top = insets.getInsets(
                        WindowInsets.Type.statusBars()
                                | WindowInsets.Type.displayCutout()).top;
                bottom = insets.getInsets(
                        WindowInsets.Type.ime()
                                | WindowInsets.Type.navigationBars()).bottom;
            } else {
                top = insets.getSystemWindowInsetTop();
                bottom = Math.max(insets.getSystemWindowInsetBottom(),
                        insets.getStableInsetBottom());
            }
            if (params.topMargin != top || params.bottomMargin != bottom) {
                params.topMargin = top;
                params.bottomMargin = bottom;
                webView.setLayoutParams(params);
            }
            return insets;
        });

        /* Barre d'etat sur fond BLANC (theme clair) : les icônes doivent
           etre SOMBRES, sinon horloge/batterie/notification restent en
           blanc sur blanc (invisible). */
        View decor = getWindow().getDecorView();
        decor.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                        | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        if (Build.VERSION.SDK_INT >= 30) {
            applyLightBarsModern();
        }

        setContentView(root);

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(BOOT_URL);
        }
    }

    /** Apparence des barres systeme — chemin moderne (API 30+),
        setSystemUiVisibility est deprecie mais conserve (API 26-29). */
    @TargetApi(30)
    private void applyLightBarsModern() {
        WindowInsetsController ctrl = getWindow().getInsetsController();
        if (ctrl != null) {
            int mask = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                    | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
            ctrl.setSystemBarsAppearance(mask, mask);
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
        if (saveExecutor != null) {
            saveExecutor.shutdown();
        }
        super.onDestroy();
    }

    /* ------------------------------------------------------------
       EXPORTS : <a download> + blob -> Telechargements
       ------------------------------------------------------------ */

    private void onDownloadStart(String url, String userAgent,
                                 String contentDisposition, String mimetype,
                                 long contentLength) {
        if (url == null || !url.startsWith("blob:")) {
            Log.d("DCC", "DL ignore (non-blob) " + url);
            return;
        }
        final String token = UUID.randomUUID().toString().replace("-", "");
        final String urlF = url;
        final String cd = contentDisposition;
        Log.d("DCC", "DL blob " + token + " " + contentLength + "o ct="
                + contentDisposition);

        /* 1) Nom exact connu par la page (download= retenu par le
              hook), sinon contentDisposition, sinon date. */
        String nameJs = "(function(){try{var n=window.__dccLastDownloadName;"
                + "if(typeof n==='string'&&n.length)return n;}"
                + "catch(e){}return null;})()";
        webView.evaluateJavascript(nameJs, nameJson -> {
            String name = decodeJsString(nameJson);
            if (name == null || name.isEmpty()) {
                name = parseDownloadFilename(cd, mimetype);
            } else {
                name = sanitizeFilename(name);
            }
            pendingBlobs.put(token, new PendingBlob(name, mimetype));
            /* 2) Lecture du blob : registre (survit à la révocation)
                  sinon repli fetch. Paquets base64 vers DccBridge. */
            String js = "(function(){var T='" + token + "';var u='"
                    + urlF.replace("\\", "\\\\").replace("'", "\\'") + "';"
                    + "var b=null;try{var r=window.__dccBlobReg;"
                    + "if(r)b=r[u];}catch(e){}"
                    + "var p=b?b.arrayBuffer():"
                    + "fetch(u).then(function(x){return x.arrayBuffer();});"
                    + "p.then(function(ab){var bb=new Uint8Array(ab);"
                    + "var CH=98304,N=Math.max(1,Math.ceil(bb.length/CH));"
                    + "for(var k=0;k<N;k++){var s=bb.subarray(k*CH,"
                    + "Math.min(bb.length,(k+1)*CH));var bin='';"
                    + "for(var j=0;j<s.length;j+=8192){bin+=String.fromCharCode"
                    + ".apply(null,s.subarray(j,Math.min(s.length,j+8192)));}"
                    + "DccBridge.blobChunk(T,k,N,window.btoa(bin),k===N-1);}})"
                    + ".catch(function(e){try{DccBridge.blobFailed(T,String(e));}"
                    + "catch(e2){}});})()";
            webView.evaluateJavascript(js,
                    value -> Log.d("DCC", "DL eval " + token + " -> " + value));
        });
    }

    /** Decode une valeur JS serialisee (chaine JSON) en texte. */
    private static String decodeJsString(String jsonValue) {
        if (jsonValue == null || jsonValue.equals("null")
                || jsonValue.equals("undefined")) {
            return null;
        }
        if (jsonValue.length() >= 2 && jsonValue.startsWith("\"")
                && jsonValue.endsWith("\"")) {
            return jsonValue.substring(1, jsonValue.length() - 1)
                    .replace("\\\"", "\"").replace("\\\\", "\\")
                    .replace("\\/", "/");
        }
        return null;
    }

    /** Nom de fichier : contentDisposition (download=) puis date. */
    private static String parseDownloadFilename(String contentDisposition,
                                                String mimetype) {
        String name = null;
        if (contentDisposition != null) {
            Matcher star = Pattern
                    .compile("filename\\*\\s*=\\s*[^']*''([^;]+)")
                    .matcher(contentDisposition);
            Matcher plain = Pattern
                    .compile("filename\\s*=\\s*\"?([^\";]+)\"?")
                    .matcher(contentDisposition);
            if (star.find()) {
                name = Uri.decode(star.group(1).trim());
            } else if (plain.find()) {
                name = plain.group(1).trim();
            }
        }
        if (name == null || name.isEmpty()) {
            String ext = "bin";
            if (mimetype != null) {
                if (mimetype.contains("json")) ext = "json";
                else if (mimetype.contains("zip")) ext = "zip";
                else if (mimetype.contains("png")) ext = "png";
                else if (mimetype.contains("pdf")) ext = "pdf";
            }
            name = "export-" + new java.text.SimpleDateFormat(
                    "yyyyMMdd-HHmmss", java.util.Locale.US)
                    .format(new java.util.Date()) + "." + ext;
        }
        return sanitizeFilename(name);
    }

    /** Caracteres interdits dans un nom de fichier. */
    private static String sanitizeFilename(String name) {
        return name.replaceAll("[\\\\/:*?\"<>|]", "_");
    }

    /** Un export en cours de recuperation (pont JS -> Java). */
    private static final class PendingBlob {
        final String filename;
        final String mime;
        final ByteArrayOutputStream data = new ByteArrayOutputStream();

        PendingBlob(String filename, String mime) {
            this.filename = filename;
            this.mime = mime;
        }
    }

    /** Pont expose a la page : paquets base64 du blob a telecharger. */
    public class DccBridge {
        @JavascriptInterface
        public void blobChunk(String token, int index, int total,
                              String b64, boolean last) {
            PendingBlob p = pendingBlobs.get(token);
            if (p == null) {
                Log.d("DCC", "DL chunk inconnu " + token);
                return;
            }
            try {
                if (b64 != null && !b64.isEmpty()) {
                    p.data.write(Base64.decode(b64, Base64.NO_WRAP));
                }
            } catch (Exception e) {
                pendingBlobs.remove(token);
                Log.d("DCC", "DL decode KO " + e);
                runOnUiThread(() -> Toast.makeText(MainActivity.this,
                        "Export impossible : " + e, Toast.LENGTH_LONG).show());
                return;
            }
            if (last) {
                pendingBlobs.remove(token);
                byte[] bytes = p.data.toByteArray();
                Log.d("DCC", "DL recupere " + p.filename + " "
                        + bytes.length + "o (" + total + " paquets)");
                saveExecutor.execute(
                        () -> finishExport(p.filename, p.mime, bytes));
            } else {
                Log.d("DCC", "DL paquet " + token + " " + (index + 1)
                        + "/" + total + " (" + p.data.size() + "o)");
            }
        }

        @JavascriptInterface
        public void blobFailed(String token, String error) {
            pendingBlobs.remove(token);
            Log.d("DCC", "DL KO " + token + " " + error);
            runOnUiThread(() -> Toast.makeText(MainActivity.this,
                    "Export impossible : " + error, Toast.LENGTH_LONG).show());
        }
    }

    /** Ecrit l'export fini et notifie l'utilisateur. */
    private void finishExport(String filename, String mime, byte[] bytes) {
        try {
            String where;
            if (Build.VERSION.SDK_INT >= 29) {
                where = saveToDownloads(filename, mime, bytes);
            } else {
                where = saveToAppDownloads(filename, bytes).getAbsolutePath();
            }
            Log.d("DCC", "DL OK " + where + " (" + bytes.length + "o)");
            runOnUiThread(() -> Toast.makeText(getApplicationContext(),
                    "Export sauvegardé : Téléchargements/" + filename,
                    Toast.LENGTH_LONG).show());
        } catch (Exception e) {
            Log.d("DCC", "DL ecriture KO " + e);
            String err = String.valueOf(e.getMessage());
            runOnUiThread(() -> Toast.makeText(getApplicationContext(),
                    "Export impossible : " + err, Toast.LENGTH_LONG).show());
        }
    }

    /** API 29+ : Telechargements systeme via MediaStore. */
    @TargetApi(29)
    private String saveToDownloads(String filename, String mime, byte[] bytes)
            throws IOException {
        ContentValues v = new ContentValues();
        v.put(MediaStore.Downloads.DISPLAY_NAME, filename);
        v.put(MediaStore.Downloads.MIME_TYPE, (mime == null || mime.isEmpty())
                ? "application/octet-stream" : mime);
        v.put(MediaStore.Downloads.RELATIVE_PATH,
                Environment.DIRECTORY_DOWNLOADS);
        Uri uri = getContentResolver().insert(
                MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
        if (uri == null) {
            throw new IOException("insert MediaStore KO");
        }
        try (OutputStream os = getContentResolver().openOutputStream(uri)) {
            if (os == null) {
                throw new IOException("openOutputStream KO");
            }
            os.write(bytes);
        }
        return uri.toString();
    }

    /** API 26-28 : dossier de l'app (sans permission externe),
        accessible en USB sous Android/data/.../files/Download. */
    private File saveToAppDownloads(String filename, byte[] bytes)
            throws IOException {
        File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (dir == null) {
            dir = getFilesDir();
        }
        if (!dir.exists() && !dir.mkdirs()) {
            throw new IOException("mkdir KO " + dir);
        }
        File out = new File(dir, filename);
        try (FileOutputStream os = new FileOutputStream(out)) {
            os.write(bytes);
        }
        return out;
    }
}
