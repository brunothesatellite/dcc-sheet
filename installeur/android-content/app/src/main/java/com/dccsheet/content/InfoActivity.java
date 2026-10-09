package com.dccsheet.content;

import android.app.Activity;
import android.os.Bundle;
import android.util.TypedValue;
import android.widget.TextView;

/**
 * Ecran minimal de l'APK de contenu : preuve d'installation + rappel
 * d'usage strictement personnel. Aucune logique (le contenu est servi
 * par DccContentProvider, sans interaction).
 */
public final class InfoActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        TextView tv = new TextView(this);
        int pad = (int) TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, 24,
                getResources().getDisplayMetrics());
        tv.setPadding(pad, pad, pad, pad);
        tv.setTextSize(16);
        tv.setText("DCC Contenu\n\n"
                + "Pack prive de l'application DCC Sheet :\n"
                + "- tokens dcc-pc-tokens (portraits de personnages)\n"
                + "- tokens funnel-tokens (portraits niveau 0)\n"
                + "- dcc-spells-reader (lecteur de sorts)\n\n"
                + "Tant que cette application est installee, DCC Sheet\n"
                + "sert ce contenu automatiquement ; sinon les zones\n"
                + "concernees restent inaccessibles (404) sans bloquer\n"
                + "l'application.\n\n"
                + "ATTENTION - USAGE PERSONNEL : ne jamais partager ni\n"
                + "publier cet APK (regle de redistribution du projet).");
        setContentView(tv);
    }
}
