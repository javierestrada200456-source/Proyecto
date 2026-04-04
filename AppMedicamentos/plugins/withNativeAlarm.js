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

const withNativeAlarm = (config) => {
  // 1. Modificar AndroidManifest.xml (Permisos y Receiver)
  config = withAndroidManifest(config, (configMod) => {
    const manifest = configMod.modResults;

    // Agregar permisos
    manifest.manifest["uses-permission"] =
      manifest.manifest["uses-permission"] || [];
    const existingPermissions = new Set(
      manifest.manifest["uses-permission"].map(
        (item) => item.$["android:name"]
      )
    );
    PERMISSIONS.forEach((permission) => {
      if (!existingPermissions.has(permission)) {
        manifest.manifest["uses-permission"].push({
          $: { "android:name": permission },
        });
      }
    });

    // Configurar Activity principal
    // Se eliminó la configuración de launchMode "singleInstance" ya que puede causar conflictos con Expo Router y dev-client.
    // Las propiedades android:showWhenLocked y android:turnScreenOn son obsoletas en Manifest y se deben manejar en código si es necesario.
    
    const application = manifest.manifest.application?.[0];
    /*
    if (application?.activity?.length) {
      const mainActivity = application.activity.find(
        (activity) => activity.$["android:name"] === ".MainActivity"
      );
      if (mainActivity) {
        // mainActivity.$["android:showWhenLocked"] = "true";
        // mainActivity.$["android:turnScreenOn"] = "true";
        // mainActivity.$["android:launchMode"] = "singleInstance";
      }
    }
    */

    // Registrar receiver si no existe
    if (application) {
      application.receiver = application.receiver || [];
      const hasReceiver = application.receiver.some(
        (receiver) => receiver.$["android:name"] === ".AlarmReceiver"
      );
      if (!hasReceiver) {
        application.receiver.push({
          $: {
            "android:name": ".AlarmReceiver",
            "android:exported": "false",
          },
        });
      }
    }

    return configMod;
  });

  // 2. Copiar archivos Kotlin (AlarmModule, Package, Receiver)
  config = withDangerousMod(config, [
    "android",
    async (configMod) => {
      const projectRoot = configMod.modRequest.projectRoot;
      const androidSrcDir = path.join(
        configMod.modRequest.platformProjectRoot,
        "app/src/main/java/com/javierestrada/appmedicamentos"
      );

      // Asegurar que el directorio destino existe
      fs.mkdirSync(androidSrcDir, { recursive: true });

      const nativeFilesDir = path.join(projectRoot, "native-code");
      const filesToCopy = ["AlarmModule.kt", "AlarmPackage.kt", "AlarmReceiver.kt"];

      filesToCopy.forEach((file) => {
        const src = path.join(nativeFilesDir, file);
        const dest = path.join(androidSrcDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        } else {
            console.warn(`Warning: Native file not found at ${src}`);
        }
      });

      return configMod;
    },
  ]);

  // 3. Modificar MainApplication.kt para registrar el paquete
  config = withMainApplication(config, (configMod) => {
    const contents = configMod.modResults.contents;
    
    // Agregar el package si no está ya
    if (!contents.includes("AlarmPackage()")) {
      // Buscar el bloque de packages
      const packageListAnchor = "PackageList(this).packages.apply {";
      if (contents.includes(packageListAnchor)) {
        configMod.modResults.contents = contents.replace(
          packageListAnchor,
          `${packageListAnchor}\n              add(AlarmPackage())`
        );
      } else {
        console.warn("Could not find PackageList anchor in MainApplication.kt");
      }
    }

    return configMod;
  });

  return config;
};

module.exports = withNativeAlarm;
