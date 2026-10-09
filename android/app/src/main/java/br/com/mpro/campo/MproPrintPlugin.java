package br.com.mpro.campo;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MproPrint")
public class MproPrintPlugin extends Plugin {
    @PluginMethod public void print(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                PrintManager manager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                manager.print("Laudo M-PRO", getBridge().getWebView().createPrintDocumentAdapter("Laudo M-PRO"),
                    new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
                call.resolve();
            } catch (Exception e) { call.reject("Não foi possível abrir a impressão.", e); }
        });
    }
}
