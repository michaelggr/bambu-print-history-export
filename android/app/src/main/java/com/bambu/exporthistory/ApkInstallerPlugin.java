package com.bambu.exporthistory;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * APK 安装器插件
 * 下载 APK 文件并触发 Android 系统安装器
 */
@CapacitorPlugin(
    name = "ApkInstaller",
    permissions = {
        @Permission(
            strings = { "android.permission.REQUEST_INSTALL_PACKAGES" },
            alias = "install"
        )
    }
)
public class ApkInstallerPlugin extends Plugin {

    private static final String TAG = "ApkInstaller";

    /**
     * 下载并安装 APK
     * 1. 从 URL 下载 APK 到应用缓存目录
     * 2. 通过 FileProvider 生成 content:// URI
     * 3. 触发系统 PackageInstaller intent
     */
    @PluginMethod
    public void installApk(PluginCall call) {
        String apkUrl = call.getString("url");
        if (apkUrl == null || apkUrl.isEmpty()) {
            call.reject("APK 下载地址不能为空");
            return;
        }

        // 在后台线程执行下载
        new Thread(() -> {
            try {
                File apkFile = downloadApk(apkUrl);
                if (apkFile == null) {
                    call.reject("APK 下载失败");
                    return;
                }

                // 切回主线程触发安装
                getActivity().runOnUiThread(() -> {
                    try {
                        installApkFile(apkFile);
                        call.resolve();
                    } catch (Exception e) {
                        Log.e(TAG, "安装 APK 失败", e);
                        call.reject("安装 APK 失败: " + e.getMessage());
                    }
                });
            } catch (Exception e) {
                Log.e(TAG, "下载 APK 失败", e);
                call.reject("下载 APK 失败: " + e.getMessage());
            }
        }).start();
    }

    /** 下载 APK 到应用缓存目录 */
    private File downloadApk(String apkUrl) {
        try {
            URL url = new URL(apkUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(30000);
            conn.setReadTimeout(60000);
            conn.connect();

            // 从 URL 提取文件名，或使用默认名
            String fileName = "bambu-export-update.apk";
            String disposition = conn.getHeaderField("Content-Disposition");
            if (disposition != null && disposition.contains("filename=")) {
                fileName = disposition.substring(disposition.indexOf("filename=") + 9)
                        .replace("\"", "").trim();
            }

            File outputDir = getActivity().getCacheDir();
            File apkFile = new File(outputDir, fileName);

            // 下载写入文件
            try (InputStream is = conn.getInputStream();
                 FileOutputStream fos = new FileOutputStream(apkFile)) {
                byte[] buffer = new byte[8192];
                int len;
                while ((len = is.read(buffer)) != -1) {
                    fos.write(buffer, 0, len);
                }
            }

            conn.disconnect();
            Log.i(TAG, "APK 下载完成: " + apkFile.getAbsolutePath());
            return apkFile;
        } catch (Exception e) {
            Log.e(TAG, "下载 APK 异常", e);
            return null;
        }
    }

    /** 触发 Android 系统安装器 */
    private void installApkFile(File apkFile) {
        Intent intent = new Intent(Intent.ACTION_VIEW);

        // Android 7.0+ 需要 FileProvider
        Uri uri;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            uri = FileProvider.getUriForFile(
                getActivity(),
                getActivity().getPackageName() + ".fileprovider",
                apkFile
            );
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } else {
            uri = Uri.fromFile(apkFile);
        }

        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getActivity().startActivity(intent);
    }
}
