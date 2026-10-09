package com.dccsheet.content;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.webkit.MimeTypeMap;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Locale;

/**
 * Fournisseur de contenu additionnel dcc-sheet (APK compagnon prive).
 *
 * Les contenus servis ici (tokens dcc-pc-tokens / funnel-tokens et le
 * lecteur de sorts dcc-spells-reader) sont STRICTEMENT PERSONNELS et
 * ne doivent JAMAIS etre integrates a l'APK dcc-sheet (regle de
 * redistribution du projet, assertions de _sync-assets.mjs).
 *
 * L'application DCC Sheet les demande via
 *   content://com.dccsheet.content/<chemin>
 * (AssetRouter) : aucune permission de stockage, aucune copie de
 * fichiers, lecture en pipe directement depuis les assets de cet APK.
 *
 * Exposition : allowlist de 3 sous-arborescences uniquement, chemins
 * avec ".." rejetes. Si l'APK n'est pas installee, l'application
 *dcc-sheet retombe proprement sur 403/404 et continue de fonctionner.
 *
 * USAGE PERSONNEL : ne jamais partager ni publier cet APK.
 */
public final class DccContentProvider extends ContentProvider {

    public static final String AUTHORITY = "com.dccsheet.content";

    /** Seuls ces sous-arborescences (racine des assets) sont servis. */
    private static final String[] ALLOWED = {
            "icons/dcc-pc-tokens/",
            "icons/funnel-tokens/",
            "dcc-spells-reader/",
    };

    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public String getType(Uri uri) {
        String path = safePath(uri);
        if (path == null) {
            return null;
        }
        int i = path.lastIndexOf('.');
        String ext = i < 0 ? "" : path.substring(i + 1).toLowerCase(Locale.ROOT);
        String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
        return mime != null ? mime : "application/octet-stream";
    }

    /**
     * Lecture en pipe : le flux d'asset est copie dans un tube par un
     * thread dedie, le descripteur est rendu au demandeur (l'APK
     * dcc-sheet lit depuis son propre processus).
     */
    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode)
            throws FileNotFoundException {
        String path = safePath(uri);
        if (path == null) {
            throw new FileNotFoundException("chemin refuse : " + uri);
        }
        final InputStream src;
        try {
            src = getContext().getAssets().open(path);
        } catch (IOException e) {
            throw new FileNotFoundException(path + " : " + e);
        }
        try {
            final ParcelFileDescriptor[] pipe = ParcelFileDescriptor.createPipe();
            new Thread(() -> {
                try (OutputStream out =
                             new ParcelFileDescriptor.AutoCloseOutputStream(pipe[1]);
                     InputStream in = src) {
                    byte[] buf = new byte[65536];
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n);
                    }
                } catch (IOException ignored) {
                    /* lecteur parti (changement de page) : rien a faire */
                }
            }, "dcc-content").start();
            return pipe[0];
        } catch (IOException e) {
            try {
                src.close();
            } catch (IOException ignored) {
                /* rien */
            }
            throw new FileNotFoundException("pipe : " + e);
        }
    }

    /** @return chemin d'asset sans slash initial, ou null si hors allowlist. */
    private static String safePath(Uri uri) {
        String p = uri.getPath();
        if (p == null || p.isEmpty() || p.contains("..")) {
            return null;
        }
        if (p.startsWith("/")) {
            p = p.substring(1);
        }
        for (String prefix : ALLOWED) {
            if (p.startsWith(prefix)) {
                return p;
            }
        }
        return null;
    }

    /* Fournisseur en lecture seule : ecritures refusees. */

    @Override
    public Cursor query(Uri uri, String[] projection, String selection,
                        String[] selectionArgs, String sortOrder) {
        return null;
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        return null;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection,
                      String[] selectionArgs) {
        return 0;
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        return 0;
    }
}
