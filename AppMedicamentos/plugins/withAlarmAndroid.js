const {
  withDangerousMod,
  withMainApplication,
  withAndroidManifest,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PERMISSIONS = [
  "android.permission.SCHEDULE_EXACT_ALARM",
  "android.permission.USE_FULL_SCREEN_INTENT",
  "android.permission.WAKE_LOCK",
  "android.permission.FOREGROUND_SERVICE_USE_DEVICE_OR_ALARM",
];

const withAlarmAndroid = (config) => {
  // 1. Copiar archivos nativos (Kotlin) y corregir el package
  config = withDangerousMod(config, [
    "android",
    async (configMod) => {
      const androidPackage = config.android?.package || "com.javierestrada.appmedicamentos";
      const packagePath = androidPackage.replace(/\./g, "/");
      
      const sourceDir = path.join(configMod.modRequest.projectRoot, "native-code");
      const destDir = path.join(
        configMod.modRequest.platformProjectRoot,
        "app/src/main/java",
        packagePath
      );

      // Asegurar que existe el directorio destino
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      const files = ["AlarmModule.kt", "AlarmPackage.kt", "AlarmReceiver.kt"];

      files.forEach((file) => {
        const sourceFile = path.join(sourceDir, file);
        const destFile = path.join(destDir, file);

        if (fs.existsSync(sourceFile)) {
          let content = fs.readFileSync(sourceFile, "utf-8");
          
          // Reemplazar el paquete viejo por el correcto del proyecto
          content = content.replace(
            /package com\.firexsuprem\.AppMedicamentos/g,
            `package ${androidPackage}`
          );
          
          fs.writeFileSync(destFile, content);
        } else {
          console.warn(`Warning: Native file not found: ${sourceFile}`);
        }
      });

      return configMod;
    },
  ]);

  // 2. Registrar el Package en MainApplication.kt
  config = withMainApplication(config, (configMod) => {
    let mainApplication = configMod.modResults.contents;
    
    // Verificar si ya está agregado
    if (!mainApplication.includes("packages.add(AlarmPackage())")) {
      const packageSearch = /PackageList\(this\)\.packages\.apply\s*{/;
      
      if (mainApplication.match(packageSearch)) {
        mainApplication = mainApplication.replace(
          packageSearch,
          `PackageList(this).packages.apply {\n            add(AlarmPackage())`
        );
      }
    }
    
    configMod.modResults.contents = mainApplication;
    return configMod;
  });

  // 3. Modificar AndroidManifest.xml (Permisos, Receiver y Activity)
  config = withAndroidManifest(config, (configMod) => {
    const manifest = configMod.modResults;

    // A. Agregar Permisos
    manifest.manifest["uses-permission"] = manifest.manifest["uses-permission"] || [];
    const existingPermissions = new Set(
      manifest.manifest["uses-permission"].map((item) => item.$["android:name"])
    );

    PERMISSIONS.forEach((permission) => {
      if (!existingPermissions.has(permission)) {
        manifest.manifest["uses-permission"].push({
          $: { "android:name": permission },
        });
      }
    });

    // B. Configurar MainActivity
    const application = manifest.manifest.application?.[0];
    if (application?.activity?.length) {
      const mainActivity = application.activity.find(
        (activity) => activity.$["android:name"] === ".MainActivity"
      );

      if (mainActivity) {
        mainActivity.$["android:showWhenLocked"] = "true";
        mainActivity.$["android:turnScreenOn"] = "true";
      }
    }

    // C. Registrar AlarmReceiver
    if (application) {
      application.receiver = application.receiver || [];
      const hasReceiver = application.receiver.some(
        (receiver) => receiver.$["android:name"] === ".AlarmReceiver"
      );

      if (!hasReceiver) {
        application.receiver.push({
          $: {
            "android:name": ".AlarmReceiver",
            "android:exported": "true",
          },
        });
      }
    }

    return configMod;
  });

  return config;
};

module.exports = withAlarmAndroid;